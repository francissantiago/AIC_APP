import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class QueryMemberOptionsDto {
  @ApiProperty({
    minLength: 3,
    maxLength: 150,
    description: 'Busca por nome (mínimo 3 caracteres)',
  })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  q!: string;

  @ApiPropertyOptional({ default: 15, minimum: 1, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit: number = 15;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Excluir membro da lista (ex.: membro em edição)',
  })
  @IsOptional()
  @IsUUID()
  excludeMemberId?: string;
}
