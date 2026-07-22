import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MemberGender } from '../enums/member-gender.enum';
import { MemberMaritalStatus } from '../enums/member-marital-status.enum';
import { MemberStatus } from '../enums/member-status.enum';

export class CreateMemberDto {
  @ApiProperty({ example: 'Maria da Silva', minLength: 1, maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(150)
  fullName!: string;

  @ApiPropertyOptional({ example: 'maria.silva@igreja.org', maxLength: 255 })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: '+5511999999999', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({
    example: '12345678900',
    maxLength: 30,
    description: 'CPF brasileiro (opcional; documento exclusivo do Brasil)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  document?: string;

  @ApiPropertyOptional({ example: '1990-05-20' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({
    enum: MemberGender,
    default: MemberGender.UNSPECIFIED,
  })
  @IsOptional()
  @IsEnum(MemberGender)
  gender?: MemberGender;

  @ApiPropertyOptional({
    enum: MemberMaritalStatus,
    default: MemberMaritalStatus.OTHER,
  })
  @IsOptional()
  @IsEnum(MemberMaritalStatus)
  maritalStatus?: MemberMaritalStatus;

  @ApiPropertyOptional({ enum: MemberStatus, default: MemberStatus.ACTIVE })
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @ApiPropertyOptional({ example: '2010-08-15' })
  @IsOptional()
  @IsDateString()
  baptismDate?: string;

  @ApiPropertyOptional({ example: '2012-01-10' })
  @IsOptional()
  @IsDateString()
  membershipDate?: string;

  @ApiPropertyOptional({ example: 'Rua das Flores, 100', maxLength: 255 })
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

  @ApiPropertyOptional({ example: 'Observações pastorais' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: '12.345.678-9',
    maxLength: 30,
    description: 'RG brasileiro (opcional; documento exclusivo do Brasil)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  rg?: string;

  @ApiPropertyOptional({ example: 'São Paulo / SP', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  placeOfBirth?: string;

  @ApiPropertyOptional({ example: 'O+', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  bloodType?: string;

  @ApiPropertyOptional({ example: 'José da Silva', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fatherName?: string;

  @ApiPropertyOptional({ example: 'Ana da Silva', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  motherName?: string;

  @ApiPropertyOptional({ example: 'Diácono', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  positionTitle?: string;

  @ApiPropertyOptional({
    example: '4f6c1c1e-4a5b-4f0e-9d2a-9a3b8c7d6e5f',
    description: 'UUID de usuário do sistema (opcional)',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
