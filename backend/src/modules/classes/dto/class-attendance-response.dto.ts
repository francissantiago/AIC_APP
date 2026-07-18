import { ApiProperty } from '@nestjs/swagger';
import { ClassEnrollmentStatus } from '../enums/class-enrollment-status.enum';

export class ClassAttendanceEntryDto {
  @ApiProperty({ format: 'uuid' })
  memberId!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  memberFullName!: string;

  @ApiProperty({ enum: [ClassEnrollmentStatus.ACTIVE] })
  enrollmentStatus!: ClassEnrollmentStatus.ACTIVE;

  @ApiProperty({ format: 'uuid', nullable: true })
  attendanceId!: string | null;

  @ApiProperty({ nullable: true, example: true })
  present!: boolean | null;

  @ApiProperty({ nullable: true, maxLength: 255 })
  notes!: string | null;
}

export class ClassSessionAttendanceDto {
  @ApiProperty({ format: 'uuid' })
  classId!: string;

  @ApiProperty({ example: 'Classe de Jovens' })
  className!: string;

  @ApiProperty({ example: '2026-07-13', format: 'date' })
  sessionDate!: string;

  @ApiProperty({ type: [ClassAttendanceEntryDto] })
  entries!: ClassAttendanceEntryDto[];
}
