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
import { SmallGroupStatus } from '../enums/small-group-status.enum';

export class QuerySmallGroupsDto {
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

  @ApiPropertyOptional({
    example: 'célula',
    description: 'Busca em name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  @ApiPropertyOptional({ enum: SmallGroupStatus })
  @IsOptional()
  @IsEnum(SmallGroupStatus)
  status?: SmallGroupStatus;
}
