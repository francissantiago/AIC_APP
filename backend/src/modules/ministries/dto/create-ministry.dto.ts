import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MinistryStatus } from '../enums/ministry-status.enum';

export class CreateMinistryDto {
  @ApiProperty({ example: 'Louvor', minLength: 1, maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: 'Equipe de louvor e adoração',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    description: 'UUID do membro líder titular (opcional)',
  })
  @IsOptional()
  @IsUUID()
  leaderMemberId?: string;

  @ApiPropertyOptional({
    enum: MinistryStatus,
    default: MinistryStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(MinistryStatus)
  status?: MinistryStatus;
}
