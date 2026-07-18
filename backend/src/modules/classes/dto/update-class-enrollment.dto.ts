import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ClassEnrollmentStatus } from '../enums/class-enrollment-status.enum';

export class UpdateClassEnrollmentDto {
  @ApiProperty({ enum: ClassEnrollmentStatus })
  @IsEnum(ClassEnrollmentStatus)
  status!: ClassEnrollmentStatus;
}
