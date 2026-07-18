import { ApiProperty } from '@nestjs/swagger';
import { SmallGroupMemberStatus } from '../enums/small-group-member-status.enum';

export class SmallGroupAttendanceEntryDto {
  @ApiProperty({ format: 'uuid' })
  memberId!: string;

  @ApiProperty({ example: 'Maria da Silva' })
  memberFullName!: string;

  @ApiProperty({ enum: [SmallGroupMemberStatus.ACTIVE] })
  memberStatus!: SmallGroupMemberStatus.ACTIVE;

  @ApiProperty({ format: 'uuid', nullable: true })
  attendanceId!: string | null;

  @ApiProperty({ nullable: true, example: true })
  present!: boolean | null;

  @ApiProperty({ nullable: true, maxLength: 255 })
  notes!: string | null;
}

export class SmallGroupMeetingAttendanceDto {
  @ApiProperty({ format: 'uuid' })
  smallGroupId!: string;

  @ApiProperty({ example: 'Célula Centro' })
  smallGroupName!: string;

  @ApiProperty({ format: 'uuid' })
  meetingId!: string;

  @ApiProperty({ example: '2026-07-18', format: 'date' })
  meetingDate!: string;

  @ApiProperty({ type: [SmallGroupAttendanceEntryDto] })
  entries!: SmallGroupAttendanceEntryDto[];
}
