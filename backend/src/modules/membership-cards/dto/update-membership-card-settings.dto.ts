import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateMembershipCardSettingsDto {
  @ApiPropertyOptional({ example: 'Igreja Pentecostal', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  headerLine1?: string;

  @ApiPropertyOptional({ maxLength: 150, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  headerLine2?: string | null;

  @ApiPropertyOptional({ maxLength: 150, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  ministryLabel?: string | null;

  @ApiPropertyOptional({ maxLength: 150, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  presidentName?: string | null;

  @ApiPropertyOptional({ example: 'PASTORA PRESIDENTE', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  presidentTitle?: string;

  @ApiPropertyOptional({ example: 24, minimum: 1, maximum: 120 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  validityMonths?: number;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  footerNotice?: string;
}
