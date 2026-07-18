import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { Permission } from '../permissions/entities/permission.entity';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { isSystemRoleCode } from './roles.constants';

const ROLES_WRITE_PERMISSION_CODE = 'roles:write';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly permissionsService: PermissionsService,
  ) {}

  async findAll(): Promise<RoleResponseDto[]> {
    const roles = await this.rolesRepository.find({
      order: { id: 'ASC' },
      relations: { permissions: true },
    });
    this.logger.debug(
      `Catálogo de roles consultado (${roles.length} registros)`,
    );
    return roles.map((role) => RoleResponseDto.fromEntity(role));
  }

  async findOne(id: number): Promise<RoleResponseDto> {
    const role = await this.getRoleOrFail(id);
    return RoleResponseDto.fromEntity(role);
  }

  async create(dto: CreateRoleDto): Promise<RoleResponseDto> {
    const code = dto.code.trim().toUpperCase();
    await this.ensureCodeAvailable(code);

    const permissions =
      dto.permissionIds !== undefined
        ? await this.permissionsService.validateIds(dto.permissionIds)
        : [];

    const role = this.rolesRepository.create({
      code,
      name: dto.name.trim(),
      description: this.normalizeDescription(dto.description),
      permissions,
    });
    const saved = await this.rolesRepository.save(role);
    this.logger.log(`Papel criado: ${saved.id} (${saved.code})`);
    return RoleResponseDto.fromEntity(saved);
  }

  async update(id: number, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    const role = await this.getRoleOrFail(id);

    if (dto.name !== undefined) {
      role.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      role.description = this.normalizeDescription(dto.description);
    }

    if (dto.permissionIds !== undefined) {
      const permissions = await this.permissionsService.validateIds(
        dto.permissionIds,
      );
      this.ensureAdminKeepsRolesWrite(role, permissions);
      role.permissions = permissions;
    }

    const saved = await this.rolesRepository.save(role);
    this.logger.log(`Papel atualizado: ${saved.id} (${saved.code})`);
    return RoleResponseDto.fromEntity(saved);
  }

  async remove(id: number): Promise<void> {
    const role = await this.getRoleOrFail(id);

    if (isSystemRoleCode(role.code)) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.ROLES_SYSTEM_PROTECTED,
        message: ApiErrorMessage[ApiErrorCode.ROLES_SYSTEM_PROTECTED],
      });
    }

    if (await this.isRoleAssigned(id)) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.ROLES_IN_USE,
        message: ApiErrorMessage[ApiErrorCode.ROLES_IN_USE],
      });
    }

    await this.rolesRepository.remove(role);
    this.logger.log(`Papel removido: ${id} (${role.code})`);
  }

  private async getRoleOrFail(id: number): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!role) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.ROLES_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.ROLES_NOT_FOUND],
      });
    }
    return role;
  }

  /**
   * Invariante D5: o papel ADMIN nunca pode ficar sem `roles:write`,
   * sob risco de lockout total do sistema de ACL. Checagem fail-fast,
   * antes de qualquer persistência.
   */
  private ensureAdminKeepsRolesWrite(
    role: Role,
    newPermissions: Permission[],
  ): void {
    if (role.code !== 'ADMIN') {
      return;
    }
    const hasRolesWrite = newPermissions.some(
      (permission) => permission.code === ROLES_WRITE_PERMISSION_CODE,
    );
    if (!hasRolesWrite) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.ROLES_ADMIN_REQUIRES_ROLES_WRITE,
        message: ApiErrorMessage[ApiErrorCode.ROLES_ADMIN_REQUIRES_ROLES_WRITE],
      });
    }
  }

  private async ensureCodeAvailable(code: string): Promise<void> {
    const existing = await this.rolesRepository.findOne({ where: { code } });
    if (existing) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.ROLES_CODE_IN_USE,
        message: ApiErrorMessage[ApiErrorCode.ROLES_CODE_IN_USE],
        details: [
          {
            field: 'code',
            code: ApiErrorCode.ROLES_CODE_IN_USE,
            message: ApiErrorMessage[ApiErrorCode.ROLES_CODE_IN_USE],
          },
        ],
      });
    }
  }

  private async isRoleAssigned(roleId: number): Promise<boolean> {
    const row = await this.rolesRepository.manager
      .createQueryBuilder()
      .select('1')
      .from('user_roles', 'ur')
      .where('ur.role_id = :roleId', { roleId })
      .limit(1)
      .getRawOne<{ '?column?': number }>();
    return !!row;
  }

  private normalizeDescription(
    description: string | null | undefined,
  ): string | null {
    if (description === null || description === undefined) {
      return null;
    }
    const trimmed = description.trim();
    return trimmed === '' ? null : trimmed;
  }
}
