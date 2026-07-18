import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ClassEnrollmentStatus } from '../enums/class-enrollment-status.enum';

export class AddClassEnrollmentDto {
  @ApiProperty({ example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })
  @IsUUID()
  memberId!: string;

  @ApiPropertyOptional({
    enum: ClassEnrollmentStatus,
    default: ClassEnrollmentStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ClassEnrollmentStatus)
  status?: ClassEnrollmentStatus;

  @ApiPropertyOptional({ example: '2026-07-18T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  enrolledAt?: string;
}
