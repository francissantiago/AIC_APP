import { SmallGroupMemberStatus } from '@enums/small-group-member-status';

export interface ISmallGroupAttendanceEntry {
  memberId: string;
  memberFullName: string;
  memberStatus: SmallGroupMemberStatus.ACTIVE;
  attendanceId: string | null;
  present: boolean | null;
  notes: string | null;
}

export interface ISmallGroupMeetingAttendance {
  smallGroupId: string;
  smallGroupName: string;
  meetingId: string;
  meetingDate: string;
  entries: ISmallGroupAttendanceEntry[];
}

export interface IUpsertSmallGroupAttendanceEntry {
  memberId: string;
  present: boolean;
  notes?: string | null;
}

export interface IUpsertSmallGroupAttendance {
  entries: IUpsertSmallGroupAttendanceEntry[];
}
