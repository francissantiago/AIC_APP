import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CongregationStatus } from '../enums/congregation-status.enum';

export class CreateBranchDto {
  @ApiProperty({
    example: 'Congregação Zona Norte',
    minLength: 1,
    maxLength: 150,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    example: '7c4b835d-3342-467b-a94b-2e464036b138',
    description:
      'Id da HQ ativa. Se omitido, resolve automaticamente a HQ desta instalação.',
  })
  @IsOptional()
  @IsUUID('4')
  parentId?: string;

  @ApiPropertyOptional({ example: 'AIC Zona Norte', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  tradeName?: string;

  @ApiPropertyOptional({ example: '12.345.678/0002-70', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  document?: string;

  @ApiPropertyOptional({ example: 'zonanorte@aic.org', maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+551133335555', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'Rua das Flores, 200', maxLength: 255 })
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

  @ApiPropertyOptional({ example: '02000-000', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string;

  @ApiPropertyOptional({ example: '2020-06-01' })
  @IsOptional()
  @IsDateString()
  foundationDate?: string;

  @ApiPropertyOptional({ example: 'https://zonanorte.aic.org', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({
    enum: CongregationStatus,
    default: CongregationStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CongregationStatus)
  status?: CongregationStatus;

  @ApiPropertyOptional({ example: 'Filial inaugurada em 2020' })
  @IsOptional()
  @IsString()
  notes?: string;
}
