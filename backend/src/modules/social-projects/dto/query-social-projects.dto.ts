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
import { SocialProjectCategory } from '../enums/social-project-category.enum';
import { SocialProjectStatus } from '../enums/social-project-status.enum';

export class QuerySocialProjectsDto {
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

  @ApiPropertyOptional({ description: 'Busca em name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  @ApiPropertyOptional({ enum: SocialProjectStatus })
  @IsOptional()
  @IsEnum(SocialProjectStatus)
  status?: SocialProjectStatus;

  @ApiPropertyOptional({ enum: SocialProjectCategory })
  @IsOptional()
  @IsEnum(SocialProjectCategory)
  category?: SocialProjectCategory;
}
