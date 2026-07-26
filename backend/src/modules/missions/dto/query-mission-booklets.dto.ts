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
import { MissionBookletDestinationType } from '../enums/mission-booklet-destination-type.enum';
import { MissionBookletStatus } from '../enums/mission-booklet-status.enum';

export class QueryMissionBookletsDto {
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

  @ApiPropertyOptional({ description: 'Busca em título ou nome do membro' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  q?: string;

  @ApiPropertyOptional({ enum: MissionBookletStatus })
  @IsOptional()
  @IsEnum(MissionBookletStatus)
  status?: MissionBookletStatus;

  @ApiPropertyOptional({ enum: MissionBookletDestinationType })
  @IsOptional()
  @IsEnum(MissionBookletDestinationType)
  destinationType?: MissionBookletDestinationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  missionFieldId?: string;
}
