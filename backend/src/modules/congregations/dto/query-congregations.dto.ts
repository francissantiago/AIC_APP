import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CongregationStatus } from '../enums/congregation-status.enum';
import { CongregationType } from '../enums/congregation-type.enum';

export class QueryCongregationsDto {
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

  @ApiPropertyOptional({ enum: CongregationType })
  @IsOptional()
  @IsEnum(CongregationType)
  type?: CongregationType;

  @ApiPropertyOptional({ enum: CongregationStatus })
  @IsOptional()
  @IsEnum(CongregationStatus)
  status?: CongregationStatus;

  @ApiPropertyOptional({
    example: 'zona norte',
    description: 'Busca em name/tradeName',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;
}
