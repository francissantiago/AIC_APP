import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class UpsertSmallGroupAttendanceEntryDto {
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

export class UpsertSmallGroupAttendanceDto {
  @ApiProperty({ type: [UpsertSmallGroupAttendanceEntryDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertSmallGroupAttendanceEntryDto)
  entries!: UpsertSmallGroupAttendanceEntryDto[];
}
