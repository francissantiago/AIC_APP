import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  PASSWORD_COMPLEXITY_MESSAGE,
  PASSWORD_COMPLEXITY_REGEX,
} from '../../../common/validation/password.constants';

export class SetupAdminDto {
  @ApiProperty({ example: 'admin', minLength: 3, maxLength: 50 })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'username deve conter apenas letras, números, ponto, hífen e underscore',
  })
  username!: string;

  @ApiProperty({ example: 'admin@igreja.org', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Administrador Geral', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({
    example: 'S3nh@Forte!',
    minLength: 8,
    maxLength: 72,
    description:
      'Senha em claro; armazenada apenas como hash bcrypt (cost 12). AIC-SEC-014.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(PASSWORD_COMPLEXITY_REGEX, {
    message: PASSWORD_COMPLEXITY_MESSAGE,
  })
  password!: string;
}

export class SetupCongregationDto {
  @ApiProperty({
    example: 'Igreja Central AIC',
    minLength: 1,
    maxLength: 150,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: 'AIC Central', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  tradeName?: string;

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
}

export class CompleteSetupDto {
  @ApiProperty({ type: SetupAdminDto })
  @IsObject()
  @ValidateNested()
  @Type(() => SetupAdminDto)
  admin!: SetupAdminDto;

  @ApiProperty({ type: SetupCongregationDto })
  @IsObject()
  @ValidateNested()
  @Type(() => SetupCongregationDto)
  congregation!: SetupCongregationDto;
}
