import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class UpsertClassAttendanceEntryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  memberId!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  present!: boolean;

  @ApiPropertyOptional({ maxLength: 255, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string | null;
}

export class UpsertClassAttendanceDto {
  @ApiProperty({
    example: '2026-07-13',
    format: 'date',
    description: 'Data da sessão (YYYY-MM-DD)',
  })
  @Matches(ISO_DATE_PATTERN)
  @IsDateString({ strict: true })
  sessionDate!: string;

  @ApiProperty({ type: [UpsertClassAttendanceEntryDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertClassAttendanceEntryDto)
  entries!: UpsertClassAttendanceEntryDto[];
}
