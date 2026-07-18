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
import { ClassEnrollmentStatus } from '../enums/class-enrollment-status.enum';

export class QueryClassEnrollmentsDto {
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

  @ApiPropertyOptional({ enum: ClassEnrollmentStatus })
  @IsOptional()
  @IsEnum(ClassEnrollmentStatus)
  status?: ClassEnrollmentStatus;

  @ApiPropertyOptional({
    maxLength: 150,
    description: 'Busca por nome do aluno',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  q?: string;
}
