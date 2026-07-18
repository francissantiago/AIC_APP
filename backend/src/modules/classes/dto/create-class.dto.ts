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
import { ClassAgeGroup } from '../enums/class-age-group.enum';
import { ClassStatus } from '../enums/class-status.enum';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class CreateClassDto {
  @ApiProperty({ example: 'Classe de Jovens', minLength: 1, maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: 'Turma da EBD para jovens',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    enum: ClassAgeGroup,
    default: ClassAgeGroup.MIXED,
  })
  @IsOptional()
  @IsEnum(ClassAgeGroup)
  ageGroup?: ClassAgeGroup;

  @ApiPropertyOptional({
    example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    nullable: true,
    description: 'UUID do membro professor (opcional)',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  teacherMemberId?: string | null;

  @ApiPropertyOptional({
    example: 0,
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
    example: '09:00',
    description: 'Horário de início (HH:mm ou HH:mm:ss)',
  })
  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, {
    message: 'startTime deve estar no formato HH:mm ou HH:mm:ss',
  })
  startTime?: string;

  @ApiPropertyOptional({ example: 'Sala 3', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  room?: string;

  @ApiPropertyOptional({
    enum: ClassStatus,
    default: ClassStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;
}
