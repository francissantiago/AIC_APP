import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { AnnouncementAudience } from '../enums/announcement-audience.enum';

export class CreateAnnouncementDto {
  @ApiProperty({
    example: 'Culto de ação de graças',
    minLength: 1,
    maxLength: 160,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @ApiProperty({
    example: 'Neste domingo teremos culto especial às 19h.',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  body!: string;

  @ApiPropertyOptional({
    enum: AnnouncementAudience,
    default: AnnouncementAudience.ALL,
    description: 'MVP aceita apenas audience=all',
  })
  @IsOptional()
  @IsEnum(AnnouncementAudience)
  audience?: AnnouncementAudience;

  @ApiPropertyOptional({
    type: [String],
    nullable: true,
    description: 'MVP: deve ser null ou lista vazia',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsArray()
  @IsString({ each: true })
  audienceTargets?: string[] | null;

  @ApiPropertyOptional({
    example: '2026-07-18T12:00:00.000Z',
    description: 'ISO datetime; default NOW()',
  })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @ApiPropertyOptional({
    example: '2026-08-01T23:59:59.000Z',
    nullable: true,
    description: 'ISO datetime; deve ser > publishedAt quando informado',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  expiresAt?: string | null;
}
