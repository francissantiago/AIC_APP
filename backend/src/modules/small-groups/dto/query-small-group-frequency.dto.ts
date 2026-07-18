import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, Matches } from 'class-validator';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class QuerySmallGroupFrequencyDto {
  @ApiProperty({ example: '2026-01-01', format: 'date' })
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  from!: string;

  @ApiProperty({ example: '2026-07-18', format: 'date' })
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  to!: string;
}
