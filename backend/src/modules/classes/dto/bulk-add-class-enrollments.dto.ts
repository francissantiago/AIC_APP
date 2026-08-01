import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ClassEnrollmentStatus } from '../enums/class-enrollment-status.enum';

export class BulkAddClassEnrollmentsDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'uuid' },
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  memberIds!: string[];

  @ApiPropertyOptional({
    enum: ClassEnrollmentStatus,
    default: ClassEnrollmentStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ClassEnrollmentStatus)
  status?: ClassEnrollmentStatus;
}

export class BulkClassEnrollmentsResponseDto {
  @ApiProperty()
  enrolled!: number;

  @ApiProperty()
  skipped!: number;
}
