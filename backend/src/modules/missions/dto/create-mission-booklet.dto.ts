import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
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
  ValidateIf,
} from 'class-validator';
import { MissionBookletDestinationType } from '../enums/mission-booklet-destination-type.enum';

const MAX_MONEY = 99_999_999_999.99;

export class CreateMissionBookletDto {
  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  @IsUUID()
  memberId!: string;

  @ApiProperty({ enum: MissionBookletDestinationType })
  @IsEnum(MissionBookletDestinationType)
  destinationType!: MissionBookletDestinationType;

  @ApiPropertyOptional({
    description: 'Obrigatório quando destinationType = field',
  })
  @ValidateIf(
    (dto: CreateMissionBookletDto) =>
      dto.destinationType === MissionBookletDestinationType.FIELD,
  )
  @IsUUID()
  missionFieldId?: string;

  @ApiPropertyOptional({
    description: 'Obrigatório quando destinationType = assignment',
  })
  @ValidateIf(
    (dto: CreateMissionBookletDto) =>
      dto.destinationType === MissionBookletDestinationType.ASSIGNMENT,
  )
  @IsUUID()
  missionAssignmentId?: string;

  @ApiPropertyOptional({ example: 'Apoio João — Quênia', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiProperty({ example: 12, minimum: 1, maximum: 120 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  installmentCount!: number;

  @ApiProperty({ example: 50, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(MAX_MONEY)
  installmentAmount!: number;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  @IsNotEmpty()
  firstDueDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(65535)
  notes?: string;
}
