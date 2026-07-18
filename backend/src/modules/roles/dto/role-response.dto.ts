import { ApiProperty } from '@nestjs/swagger';
import { PermissionResponseDto } from '../../permissions/dto/permission-response.dto';
import { Role } from '../entities/role.entity';
import { isSystemRoleCode } from '../roles.constants';

export class RoleResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'TREASURER', description: 'Código estável do papel' })
  code!: string;

  @ApiProperty({ example: 'Tesoureiro' })
  name!: string;

  @ApiProperty({
    example: 'Gestão financeira (dízimos, ofertas, despesas)',
    nullable: true,
    type: String,
  })
  description!: string | null;

  @ApiProperty({
    example: true,
    description:
      'Indica se o papel é seedado/protegido (derivado de SYSTEM_ROLE_CODES)',
  })
  isSystem!: boolean;

  @ApiProperty({ type: PermissionResponseDto, isArray: true })
  permissions!: PermissionResponseDto[];

  static fromEntity(role: Role): RoleResponseDto {
    const dto = new RoleResponseDto();
    dto.id = role.id;
    dto.code = role.code;
    dto.name = role.name;
    dto.description = role.description;
    dto.isSystem = isSystemRoleCode(role.code);
    dto.permissions = (role.permissions ?? []).map((permission) =>
      PermissionResponseDto.fromEntity(permission),
    );
    return dto;
  }
}
