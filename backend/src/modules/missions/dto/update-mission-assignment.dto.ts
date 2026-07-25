import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { MissionAssignmentRole } from '../enums/mission-assignment-role.enum';
import { MissionAssignmentStatus } from '../enums/mission-assignment-status.enum';

export class UpdateMissionAssignmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  missionFieldId?: string;

  @ApiPropertyOptional({ enum: MissionAssignmentRole })
  @IsOptional()
  @IsEnum(MissionAssignmentRole)
  role?: MissionAssignmentRole;

  @ApiPropertyOptional({ enum: MissionAssignmentStatus })
  @IsOptional()
  @IsEnum(MissionAssignmentStatus)
  status?: MissionAssignmentStatus;

  @ApiPropertyOptional({ example: '2026-01-15' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2028-01-15', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  expectedEndDate?: string | null;

  @ApiPropertyOptional({ example: '2028-06-01', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  actualEndDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(65535)
  notes?: string | null;
}
