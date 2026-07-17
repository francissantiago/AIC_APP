import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, IsPositive } from 'class-validator';

export class AssignRolesDto {
  @ApiProperty({
    type: [Number],
    example: [1, 5],
    description:
      'Conjunto completo de roles do usuário (substitui o atual; mínimo 1)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  roleIds!: number[];
}
