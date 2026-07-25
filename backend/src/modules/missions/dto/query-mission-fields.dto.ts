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
import { MissionFieldStatus } from '../enums/mission-field-status.enum';

export class QueryMissionFieldsDto {
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
    example: 'quênia',
    description: 'Busca em name, country, city',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  @ApiPropertyOptional({ enum: MissionFieldStatus })
  @IsOptional()
  @IsEnum(MissionFieldStatus)
  status?: MissionFieldStatus;

  @ApiPropertyOptional({ example: 'Brasil', description: 'Filtra por país' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}
