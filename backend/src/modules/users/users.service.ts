import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
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
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    await this.assertUniqueness(dto.username, dto.email);
    const roles = await this.resolveRoles(dto.roleIds);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    const user = this.usersRepository.create({
      username: dto.username,
      email: dto.email,
      fullName: dto.fullName,
      status: dto.status ?? UserStatus.PENDING,
      passwordHash,
      roles,
    });
    const saved = await this.usersRepository.save(user);
    this.logger.log(`Usuário criado: ${saved.id} (${saved.username})`);
    return UserResponseDto.fromEntity(saved);
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
    return {
      data: users.map((user) => UserResponseDto.fromEntity(user)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.getUserOrFail(id);
    return UserResponseDto.fromEntity(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
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

    const saved = await this.usersRepository.save(user);
    this.logger.log(`Usuário atualizado: ${saved.id}`);
    return UserResponseDto.fromEntity(saved);
  }

  async setRoles(id: string, dto: AssignRolesDto): Promise<UserResponseDto> {
    const user = await this.getUserOrFail(id);
    user.roles = await this.resolveRoles(dto.roleIds);
    const saved = await this.usersRepository.save(user);
    this.logger.log(
      `Roles do usuário ${saved.id} substituídas: [${dto.roleIds.join(', ')}]`,
    );
    return UserResponseDto.fromEntity(saved);
  }

  async remove(id: string): Promise<void> {
    const user = await this.getUserOrFail(id);
    await this.usersRepository.softRemove(user);
    this.logger.log(`Usuário removido (soft delete): ${id}`);
  }

  /**
   * Busca usuário para autenticação (inclui passwordHash).
   * Soft-deleted não é retornado (sem withDeleted).
   */
  async findByEmailForAuth(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('user.email = :email', { email })
      .getOne();
  }

  async touchLastLogin(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      lastLoginAt: new Date(),
    });
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
    const roles = await this.rolesRepository.findBy({ id: In(uniqueIds) });
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
}
