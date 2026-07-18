import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class QuerySmallGroupMeetingsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ example: '2026-01-01', format: 'date' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  from?: string;

  @ApiPropertyOptional({ example: '2026-07-18', format: 'date' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  to?: string;
}
