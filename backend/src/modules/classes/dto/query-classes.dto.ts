import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ClassAgeGroup } from '../enums/class-age-group.enum';
import { ClassStatus } from '../enums/class-status.enum';

export class QueryClassesDto {
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
    example: 'jovens',
    description: 'Busca em name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  @ApiPropertyOptional({ enum: ClassStatus })
  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;

  @ApiPropertyOptional({ enum: ClassAgeGroup })
  @IsOptional()
  @IsEnum(ClassAgeGroup)
  ageGroup?: ClassAgeGroup;

  @ApiPropertyOptional({
    example: 0,
    minimum: 0,
    maximum: 6,
    description: '0=Domingo .. 6=Sábado',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({
    example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    description: 'Filtra turmas pelo professor',
  })
  @IsOptional()
  @IsUUID()
  teacherMemberId?: string;
}
