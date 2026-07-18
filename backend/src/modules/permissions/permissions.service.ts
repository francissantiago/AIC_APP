import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { PermissionResponseDto } from './dto/permission-response.dto';
import { Permission } from './entities/permission.entity';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {}

  async findAll(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionsRepository.find({
      order: { id: 'ASC' },
    });
    this.logger.debug(
      `Catálogo de permissões consultado (${permissions.length} registros)`,
    );
    return permissions.map((permission) =>
      PermissionResponseDto.fromEntity(permission),
    );
  }

  /** Valida que todos os ids existem no catálogo; retorna as entities encontradas. */
  async validateIds(ids: number[]): Promise<Permission[]> {
    const uniqueIds = [...new Set(ids)];
    const permissions = await this.permissionsRepository.findBy({
      id: In(uniqueIds),
    });
    if (permissions.length !== uniqueIds.length) {
      const foundIds = new Set(permissions.map((permission) => permission.id));
      const missing = uniqueIds.filter((id) => !foundIds.has(id));
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.PERMISSIONS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.PERMISSIONS_NOT_FOUND],
        details: [
          {
            field: 'permissionIds',
            code: ApiErrorCode.PERMISSIONS_NOT_FOUND,
            message: `Permissões inexistentes: [${missing.join(', ')}]`,
          },
        ],
      });
    }
    return permissions;
  }
}
