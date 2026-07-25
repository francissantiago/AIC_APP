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
import { MissionFieldStatus } from '../enums/mission-field-status.enum';

export class CreateMissionFieldDto {
  @ApiProperty({ example: 'África — Quênia', minLength: 1, maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'Quênia', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country!: string;

  @ApiPropertyOptional({ example: 'Nairobi', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Nairobi County', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({
    example: 'Campo missionário na África Oriental',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    description: 'UUID do membro coordenador (opcional)',
  })
  @IsOptional()
  @IsUUID()
  coordinatorMemberId?: string;

  @ApiPropertyOptional({
    enum: MissionFieldStatus,
    default: MissionFieldStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(MissionFieldStatus)
  status?: MissionFieldStatus;
}
