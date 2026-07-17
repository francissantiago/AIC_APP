import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CongregationStatus } from '../enums/congregation-status.enum';
import { CongregationType } from '../enums/congregation-type.enum';

export class UpdateCongregationDto {
  @ApiPropertyOptional({
    example: 'Igreja Central AIC',
    minLength: 1,
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: 'AIC Central', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  tradeName?: string;

  @ApiPropertyOptional({ enum: CongregationType })
  @IsOptional()
  @IsEnum(CongregationType)
  type?: CongregationType;

  @ApiPropertyOptional({ example: '12.345.678/0001-99', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  document?: string;

  @ApiPropertyOptional({ example: 'contato@aic.org', maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+551133334444', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'Av. Paulista, 1000', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: 'São Paulo', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'SP', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  state?: string;

  @ApiPropertyOptional({ example: '01310-100', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string;

  @ApiPropertyOptional({ example: '1990-03-15' })
  @IsOptional()
  @IsDateString()
  foundationDate?: string;

  @ApiPropertyOptional({ example: 'https://www.aic.org', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({ enum: CongregationStatus })
  @IsOptional()
  @IsEnum(CongregationStatus)
  status?: CongregationStatus;

  @ApiPropertyOptional({ example: 'Congregação sede administrativa' })
  @IsOptional()
  @IsString()
  notes?: string;
}
