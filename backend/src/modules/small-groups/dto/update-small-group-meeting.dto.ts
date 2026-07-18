import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class UpdateSmallGroupMeetingDto {
  @ApiPropertyOptional({
    example: '2026-07-18',
    format: 'date',
    description: 'Data da reunião (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  meetingDate?: string;

  @ApiPropertyOptional({
    example: 'Discipulado',
    maxLength: 255,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  theme?: string | null;

  @ApiPropertyOptional({
    example: 'Estudo do capítulo 1',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}
