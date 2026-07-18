import { ClassEnrollmentStatus } from '@enums/class-enrollment-status';

/** Espelha ClassEnrollmentResponseDto do backend. */
export interface IClassEnrollment {
  classId: string;
  memberId: string;
  memberFullName: string;
  status: ClassEnrollmentStatus;
  enrolledAt: string;
}
