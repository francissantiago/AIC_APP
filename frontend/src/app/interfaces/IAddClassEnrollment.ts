import { ClassEnrollmentStatus } from '@enums/class-enrollment-status';

/** Espelha AddClassEnrollmentDto do backend. */
export interface IAddClassEnrollment {
  memberId: string;
  status?: ClassEnrollmentStatus;
  enrolledAt?: string;
}
