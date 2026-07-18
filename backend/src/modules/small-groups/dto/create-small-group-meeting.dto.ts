import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateSmallGroupMeetingDto {
  @ApiProperty({
    example: '2026-07-18',
    format: 'date',
    description: 'Data da reunião (YYYY-MM-DD)',
  })
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  meetingDate!: string;

  @ApiPropertyOptional({ example: 'Discipulado', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  theme?: string;

  @ApiPropertyOptional({ example: 'Estudo do capítulo 1', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
