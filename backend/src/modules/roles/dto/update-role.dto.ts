import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Voluntário', maxLength: 80 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({
    example: 'Apoio em eventos e ministérios',
    nullable: true,
    maxLength: 255,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === null) {
      return null;
    }
    if (value === undefined) {
      return undefined;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    }
    return value;
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(255)
  description?: string | null;

  @ApiPropertyOptional({
    type: Number,
    isArray: true,
    example: [9, 10],
    description:
      'Se informado, substitui por completo o conjunto de permissões do papel (replace); se omitido, permissões atuais não são alteradas',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  permissionIds?: number[];
}
