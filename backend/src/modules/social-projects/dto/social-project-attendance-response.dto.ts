import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SocialProjectAttendanceEntryDto {
  @ApiProperty()
  memberId!: string;

  @ApiProperty()
  memberFullName!: string;

  @ApiPropertyOptional({ nullable: true })
  attendanceId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  present!: boolean | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;
}

export class SocialProjectAttendanceResponseDto {
  @ApiProperty()
  socialProjectId!: string;

  @ApiProperty()
  socialProjectName!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  sessionDate!: string;

  @ApiProperty()
  sessionTitle!: string;

  @ApiProperty({ type: SocialProjectAttendanceEntryDto, isArray: true })
  entries!: SocialProjectAttendanceEntryDto[];
}
