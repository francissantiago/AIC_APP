import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, Matches } from 'class-validator';
import { ReportScopeQueryDto } from '../../congregations/dto/report-scope-query.dto';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class QueryClassFrequencyDto extends ReportScopeQueryDto {
  @ApiProperty({ example: '2026-01-01', format: 'date' })
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  from!: string;

  @ApiProperty({ example: '2026-07-18', format: 'date' })
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  to!: string;
}
