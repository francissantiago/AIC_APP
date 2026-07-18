import { ApiProperty } from '@nestjs/swagger';
import { Permission } from '../entities/permission.entity';

export class PermissionResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({
    example: 'finance:write',
    description: 'Formato recurso:ação',
  })
  code!: string;

  @ApiProperty({ example: 'finance' })
  resource!: string;

  @ApiProperty({ example: 'write', enum: ['read', 'write'] })
  action!: string;

  @ApiProperty({
    example: 'Criar, editar, excluir categorias e lançamentos financeiros',
    nullable: true,
    type: String,
  })
  description!: string | null;

  static fromEntity(permission: Permission): PermissionResponseDto {
    const dto = new PermissionResponseDto();
    dto.id = permission.id;
    dto.code = permission.code;
    dto.resource = permission.resource;
    dto.action = permission.action;
    dto.description = permission.description;
    return dto;
  }
}
