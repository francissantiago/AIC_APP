import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, EntityManager, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { CongregationsService } from '../congregations/congregations.service';
import { MemberUserLinkService } from '../member-user-link/member-user-link.service';
import { Role } from '../roles/entities/role.entity';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  PaginatedUsersResponseDto,
  UserResponseDto,
} from './dto/user-response.dto';
import { User } from './entities/user.entity';
import { UserStatus } from './enums/user-status.enum';

const BCRYPT_COST = 12;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly memberUserLinkService: MemberUserLinkService,
    @Inject(forwardRef(() => CongregationsService))
    private readonly congregationsService: CongregationsService,
  ) {}

  async create(
    dto: CreateUserDto,
    actor: UserResponseDto,
    activeCongregationId?: string,
  ): Promise<UserResponseDto> {
    await this.assertUniqueness(dto.username, dto.email);
    const roles = await this.resolveRoles(dto.roleIds);
    this.assertCanAssignRoles(actor, roles);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    const saved = await this.usersRepository.manager.transaction(
      async (manager) => {
        const user = manager.create(User, {
          username: dto.username,
          email: dto.email,
          fullName: dto.fullName,
          status: dto.status ?? UserStatus.PENDING,
          passwordHash,
          roles,
        });
        const persisted = await manager.save(user);
        if (dto.memberId) {
          const congregationId =
            await this.resolveCongregationId(activeCongregationId);
          await this.memberUserLinkService.linkUserToMember(
            persisted.id,
            dto.memberId,
            congregationId,
            manager,
          );
        }
        return persisted;
      },
    );

    this.logger.log(`Usuário criado: ${saved.id} (${saved.username})`);
    return this.toUserResponse(saved);
  }

  async findAll(query: QueryUsersDto): Promise<PaginatedUsersResponseDto> {
    const { page, limit, status, roleCode, q } = query;

    const qb = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('user.status = :status', { status });
    }
    if (q) {
      qb.andWhere(
        '(user.username LIKE :q OR user.email LIKE :q OR user.fullName LIKE :q)',
        { q: `%${q}%` },
      );
    }
    if (roleCode) {
      // EXISTS em subquery para não restringir as roles retornadas ao filtro
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM user_roles ur
          INNER JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = user.id AND r.code = :roleCode
        )`,
        { roleCode },
      );
    }

    const [users, total] = await qb.getManyAndCount();
    const links = await this.memberUserLinkService.findMemberLinksByUserIds(
      users.map((user) => user.id),
    );
    return {
      data: users.map((user) =>
        UserResponseDto.fromEntity(user, links.get(user.id) ?? null),
      ),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.getUserOrFail(id);
    return this.toUserResponse(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    activeCongregationId?: string,
  ): Promise<UserResponseDto> {
    const user = await this.getUserOrFail(id);

    if (dto.email && dto.email !== user.email) {
      const conflict = await this.usersRepository.findOne({
        where: { email: dto.email },
        withDeleted: true,
      });
      if (conflict && conflict.id !== id) {
        throw new ApiException(HttpStatus.CONFLICT, {
          code: ApiErrorCode.USERS_EMAIL_IN_USE,
          message: ApiErrorMessage[ApiErrorCode.USERS_EMAIL_IN_USE],
          details: [
            {
              field: 'email',
              code: ApiErrorCode.USERS_EMAIL_IN_USE,
              message: ApiErrorMessage[ApiErrorCode.USERS_EMAIL_IN_USE],
            },
          ],
        });
      }
      user.email = dto.email;
    }
    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName;
    }
    if (dto.status !== undefined) {
      user.status = dto.status;
    }

    const saved = await this.usersRepository.manager.transaction(
      async (manager) => {
        const persisted = await manager.save(user);
        if (dto.memberId !== undefined) {
          await this.applyMemberLinkChange(
            persisted.id,
            dto.memberId,
            activeCongregationId,
            manager,
          );
        }
        return persisted;
      },
    );

    this.logger.log(`Usuário atualizado: ${saved.id}`);
    return this.toUserResponse(saved);
  }

  async setRoles(
    id: string,
    dto: AssignRolesDto,
    actor: UserResponseDto,
  ): Promise<UserResponseDto> {
    const user = await this.getUserOrFail(id);
    const roles = await this.resolveRoles(dto.roleIds);
    this.assertCanAssignRoles(actor, roles);
    user.roles = roles;
    const saved = await this.usersRepository.save(user);
    this.logger.log(
      `Roles do usuário ${saved.id} substituídas: [${dto.roleIds.join(', ')}]`,
    );
    return this.toUserResponse(saved);
  }

  async remove(id: string): Promise<void> {
    const user = await this.getUserOrFail(id);
    await this.usersRepository.softRemove(user);
    this.logger.log(`Usuário removido (soft delete): ${id}`);
  }

  /**
   * Busca usuário para autenticação (inclui passwordHash e twoFactorSecret).
   * Soft-deleted não é retornado (sem withDeleted).
   */
  async findByEmailForAuth(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .addSelect('user.twoFactorSecret')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('user.email = :email', { email })
      .getOne();
  }

  /**
   * Carrega passwordHash + twoFactorSecret para self-service (senha / 2FA).
   */
  async findOneForAuthSecrets(userId: string): Promise<User> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .addSelect('user.twoFactorSecret')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('user.id = :userId', { userId })
      .getOne();
    if (!user) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.USERS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.USERS_NOT_FOUND],
      });
    }
    return user;
  }

  async updateProfile(
    userId: string,
    data: { fullName?: string; email?: string },
  ): Promise<UserResponseDto> {
    const user = await this.getUserOrFail(userId);

    if (data.email !== undefined && data.email !== user.email) {
      const conflict = await this.usersRepository.findOne({
        where: { email: data.email },
        withDeleted: true,
      });
      if (conflict && conflict.id !== userId) {
        throw new ApiException(HttpStatus.CONFLICT, {
          code: ApiErrorCode.USERS_EMAIL_IN_USE,
          message: ApiErrorMessage[ApiErrorCode.USERS_EMAIL_IN_USE],
          details: [
            {
              field: 'email',
              code: ApiErrorCode.USERS_EMAIL_IN_USE,
              message: ApiErrorMessage[ApiErrorCode.USERS_EMAIL_IN_USE],
            },
          ],
        });
      }
      user.email = data.email;
    }
    if (data.fullName !== undefined) {
      user.fullName = data.fullName;
    }

    const saved = await this.usersRepository.save(user);
    this.logger.log(`Perfil atualizado (self-service): ${saved.id}`);
    return UserResponseDto.fromEntity(saved);
  }

  async updatePasswordHash(userId: string, hash: string): Promise<void> {
    await this.usersRepository.update(userId, { passwordHash: hash });
    this.logger.log(`Senha atualizada (self-service): ${userId}`);
  }

  async incrementTokenVersion(userId: string): Promise<void> {
    await this.usersRepository.increment({ id: userId }, 'tokenVersion', 1);
    this.logger.log(`tokenVersion incrementado: ${userId}`);
  }

  /**
   * Valida JWT: carrega usuário + roles e compara tokenVersion do payload.
   * Payload antigo sem `tv` é tratado como 0.
   */
  async findOneForJwtValidation(
    userId: string,
    tokenVersionFromPayload?: number,
  ): Promise<UserResponseDto> {
    const user = await this.getUserOrFail(userId);
    const expected = user.tokenVersion ?? 0;
    const actual = tokenVersionFromPayload ?? 0;
    if (actual !== expected) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, {
        code: ApiErrorCode.AUTH_INVALID_CREDENTIALS,
        message: ApiErrorMessage[ApiErrorCode.AUTH_INVALID_CREDENTIALS],
      });
    }
    return UserResponseDto.fromEntity(user);
  }

  async setTwoFactorSecret(
    userId: string,
    secret: string | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, { twoFactorSecret: secret });
  }

  async setTwoFactorEnabled(userId: string, enabled: boolean): Promise<void> {
    await this.usersRepository.update(userId, { twoFactorEnabled: enabled });
  }

  async touchLastLogin(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      lastLoginAt: new Date(),
    });
  }

  private async toUserResponse(user: User): Promise<UserResponseDto> {
    const memberLink = await this.memberUserLinkService.findMemberLinkByUserId(
      user.id,
    );
    return UserResponseDto.fromEntity(user, memberLink);
  }

  private async resolveCongregationId(
    activeCongregationId?: string,
  ): Promise<string> {
    if (activeCongregationId) {
      return activeCongregationId;
    }
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private async applyMemberLinkChange(
    userId: string,
    memberId: string | null,
    activeCongregationId: string | undefined,
    manager: EntityManager,
  ): Promise<void> {
    const currentLink =
      await this.memberUserLinkService.findMemberLinkByUserId(userId);
    if (memberId === null) {
      await this.memberUserLinkService.unlinkUserFromMember(userId, manager);
      return;
    }
    if (currentLink?.memberId === memberId) {
      return;
    }
    if (currentLink) {
      await this.memberUserLinkService.unlinkUserFromMember(userId, manager);
    }
    const congregationId =
      await this.resolveCongregationId(activeCongregationId);
    await this.memberUserLinkService.linkUserToMember(
      userId,
      memberId,
      congregationId,
      manager,
    );
  }

  private async getUserOrFail(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { roles: { permissions: true } },
    });
    if (!user) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.USERS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.USERS_NOT_FOUND],
      });
    }
    return user;
  }

  /** Unicidade considera registros soft-deleted: username/email permanecem reservados. */
  private async assertUniqueness(
    username: string,
    email: string,
  ): Promise<void> {
    const conflict = await this.usersRepository.findOne({
      where: [{ username }, { email }],
      withDeleted: true,
    });
    if (conflict) {
      const isUsername = conflict.username === username;
      const code = isUsername
        ? ApiErrorCode.USERS_USERNAME_IN_USE
        : ApiErrorCode.USERS_EMAIL_IN_USE;
      const field = isUsername ? 'username' : 'email';
      throw new ApiException(HttpStatus.CONFLICT, {
        code,
        message: ApiErrorMessage[code],
        details: [
          {
            field,
            code,
            message: ApiErrorMessage[code],
          },
        ],
      });
    }
  }

  private async resolveRoles(roleIds: number[]): Promise<Role[]> {
    const uniqueIds = [...new Set(roleIds)];
    const roles = await this.rolesRepository.find({
      where: { id: In(uniqueIds) },
      relations: { permissions: true },
    });
    if (roles.length !== uniqueIds.length) {
      const foundIds = new Set(roles.map((role) => role.id));
      const missing = uniqueIds.filter((roleId) => !foundIds.has(roleId));
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.USERS_ROLES_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.USERS_ROLES_NOT_FOUND],
        details: [
          {
            field: 'roleIds',
            code: ApiErrorCode.USERS_ROLES_NOT_FOUND,
            message: `Roles inexistentes: [${missing.join(', ')}]`,
          },
        ],
      });
    }
    return roles;
  }

  /**
   * Impede escalação via users:write (AIC-SEC-003):
   * - só ADMIN atribui o papel ADMIN;
   * - não-ADMIN só atribui roles cujas permissões ⊆ das do ator.
   */
  private assertCanAssignRoles(actor: UserResponseDto, roles: Role[]): void {
    const actorIsAdmin = actor.roles.some((role) => role.code === 'ADMIN');
    const actorPerms = new Set(actor.permissions);

    for (const role of roles) {
      if (role.code === 'ADMIN' && !actorIsAdmin) {
        throw new ApiException(HttpStatus.FORBIDDEN, {
          code: ApiErrorCode.AUTH_FORBIDDEN,
          message: ApiErrorMessage[ApiErrorCode.AUTH_FORBIDDEN],
        });
      }
      if (actorIsAdmin) {
        continue;
      }
      for (const permission of role.permissions ?? []) {
        if (!actorPerms.has(permission.code)) {
          throw new ApiException(HttpStatus.FORBIDDEN, {
            code: ApiErrorCode.AUTH_FORBIDDEN,
            message: ApiErrorMessage[ApiErrorCode.AUTH_FORBIDDEN],
          });
        }
      }
    }
  }
}
