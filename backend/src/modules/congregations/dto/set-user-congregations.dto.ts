import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class SetUserCongregationsDto {
  @ApiProperty({
    type: [String],
    example: [
      '7c4b835d-3342-467b-a94b-2e464036b138',
      'a1b2c3d4-5e6f-4788-9a0b-1c2d3e4f5a6b',
    ],
    description:
      'Conjunto completo de congregações do usuário (substitui o atual; mínimo 1)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  congregationIds!: string[];

  @ApiProperty({
    example: '7c4b835d-3342-467b-a94b-2e464036b138',
    description: 'Deve estar presente em congregationIds',
  })
  @IsUUID('4')
  defaultCongregationId!: string;
}
