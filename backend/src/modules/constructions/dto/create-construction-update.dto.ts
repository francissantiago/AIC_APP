import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateConstructionUpdateDto {
  @ApiProperty()
  @IsUUID()
  constructionProjectId!: string;

  @ApiProperty({ minLength: 1, maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-07-25' })
  @IsDateString()
  recordedAt!: string;
}
