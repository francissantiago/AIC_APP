import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../entities/role.entity';

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

  static fromEntity(role: Role): RoleResponseDto {
    const dto = new RoleResponseDto();
    dto.id = role.id;
    dto.code = role.code;
    dto.name = role.name;
    dto.description = role.description;
    return dto;
  }
}
