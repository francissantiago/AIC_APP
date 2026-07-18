import { ClassEnrollmentStatus } from '@enums/class-enrollment-status';

/** Espelha UpdateClassEnrollmentDto do backend. */
export interface IUpdateClassEnrollment {
  status: ClassEnrollmentStatus;
}
