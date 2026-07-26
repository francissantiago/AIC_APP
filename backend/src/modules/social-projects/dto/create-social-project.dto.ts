import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { SocialProjectCategory } from '../enums/social-project-category.enum';
import { SocialProjectStatus } from '../enums/social-project-status.enum';

export class CreateSocialProjectDto {
  @ApiProperty({
    example: 'Projeto Música Jovem',
    minLength: 1,
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    enum: SocialProjectCategory,
    default: SocialProjectCategory.OTHER,
  })
  @IsOptional()
  @IsEnum(SocialProjectCategory)
  category?: SocialProjectCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  leaderMemberId?: string;

  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 6 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ example: '19:30:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budgetAmount?: number;

  @ApiPropertyOptional({
    enum: SocialProjectStatus,
    default: SocialProjectStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SocialProjectStatus)
  status?: SocialProjectStatus;
}
