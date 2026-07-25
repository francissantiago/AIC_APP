import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { MissionAssignmentRole } from '../enums/mission-assignment-role.enum';
import { MissionAssignmentStatus } from '../enums/mission-assignment-status.enum';

export class CreateMissionAssignmentDto {
  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  @IsUUID()
  memberId!: string;

  @ApiProperty({ example: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff' })
  @IsUUID()
  missionFieldId!: string;

  @ApiPropertyOptional({
    enum: MissionAssignmentRole,
    default: MissionAssignmentRole.MISSIONARY,
  })
  @IsOptional()
  @IsEnum(MissionAssignmentRole)
  role?: MissionAssignmentRole;

  @ApiPropertyOptional({
    enum: MissionAssignmentStatus,
    default: MissionAssignmentStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(MissionAssignmentStatus)
  status?: MissionAssignmentStatus;

  @ApiProperty({ example: '2026-01-15' })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiPropertyOptional({ example: '2028-01-15' })
  @IsOptional()
  @IsDateString()
  expectedEndDate?: string;

  @ApiPropertyOptional({ example: 'Envio de longo prazo' })
  @IsOptional()
  @IsString()
  @MaxLength(65535)
  notes?: string;
}
