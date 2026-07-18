import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { SmallGroupStatus } from '../enums/small-group-status.enum';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class CreateSmallGroupDto {
  @ApiProperty({ example: 'Célula Centro', minLength: 1, maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: 'Grupo de comunhão do centro',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    nullable: true,
    description: 'UUID do membro líder titular (opcional)',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  leaderMemberId?: string | null;

  @ApiPropertyOptional({
    example: 'Rua das Flores, 100',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({
    example: 3,
    minimum: 0,
    maximum: 6,
    default: 0,
    description: '0=Domingo .. 6=Sábado (Date.getDay)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({
    example: '19:30',
    description: 'Horário de início (HH:mm ou HH:mm:ss)',
  })
  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, {
    message: 'startTime deve estar no formato HH:mm ou HH:mm:ss',
  })
  startTime?: string;

  @ApiPropertyOptional({
    enum: SmallGroupStatus,
    default: SmallGroupStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SmallGroupStatus)
  status?: SmallGroupStatus;
}
