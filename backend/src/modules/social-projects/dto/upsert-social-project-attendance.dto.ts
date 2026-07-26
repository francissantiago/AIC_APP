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

export class UpsertSocialProjectAttendanceEntryDto {
  @ApiProperty()
  @IsUUID()
  memberId!: string;

  @ApiProperty()
  @IsBoolean()
  present!: boolean;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}

export class UpsertSocialProjectAttendanceDto {
  @ApiProperty({ type: UpsertSocialProjectAttendanceEntryDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertSocialProjectAttendanceEntryDto)
  entries!: UpsertSocialProjectAttendanceEntryDto[];
}
