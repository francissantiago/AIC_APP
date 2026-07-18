import { ClassEnrollmentStatus } from '@enums/class-enrollment-status';

/** Espelha ClassAttendanceEntryDto do backend. */
export interface IClassAttendanceEntry {
  memberId: string;
  memberFullName: string;
  enrollmentStatus: ClassEnrollmentStatus.ACTIVE;
  attendanceId: string | null;
  present: boolean | null;
  notes: string | null;
}
