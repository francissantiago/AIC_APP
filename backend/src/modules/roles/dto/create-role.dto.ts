import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimUpper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateRoleDto {
  @ApiProperty({
    example: 'VOLUNTEER',
    maxLength: 30,
    description:
      'Código estável (2–30 chars: A–Z, 0–9, underscore; começa com letra)',
  })
  @Transform(trimUpper)
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{1,29}$/, {
    message:
      'code deve ter 2–30 caracteres: A–Z, 0–9, underscore; começar com letra',
  })
  code!: string;

  @ApiProperty({ example: 'Voluntário', maxLength: 80 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

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
      'Ids de permissões concedidas ao papel; se omitido, papel nasce sem nenhuma permissão',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  permissionIds?: number[];
}
