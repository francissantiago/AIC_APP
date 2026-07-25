import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MissionAssignmentRole } from '../enums/mission-assignment-role.enum';
import { MissionAssignmentStatus } from '../enums/mission-assignment-status.enum';

export class QueryMissionAssignmentsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    example: 'maria',
    description: 'Busca em nome do membro ou campo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  @ApiPropertyOptional({ enum: MissionAssignmentStatus })
  @IsOptional()
  @IsEnum(MissionAssignmentStatus)
  status?: MissionAssignmentStatus;

  @ApiPropertyOptional({ enum: MissionAssignmentRole })
  @IsOptional()
  @IsEnum(MissionAssignmentRole)
  role?: MissionAssignmentRole;

  @ApiPropertyOptional({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  @IsOptional()
  @IsUUID()
  missionFieldId?: string;

  @ApiPropertyOptional({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  @IsOptional()
  @IsUUID()
  memberId?: string;
}
