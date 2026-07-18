import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, Matches } from 'class-validator';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class QuerySessionAttendanceDto {
  @ApiProperty({
    example: '2026-07-13',
    format: 'date',
    description: 'Data da sessão (YYYY-MM-DD)',
  })
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  sessionDate!: string;
}
