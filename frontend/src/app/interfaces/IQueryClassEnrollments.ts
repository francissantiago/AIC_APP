import { ClassEnrollmentStatus } from '@enums/class-enrollment-status';

/** Espelha QueryClassEnrollmentsDto do backend. */
export interface IQueryClassEnrollments {
  page?: number;
  limit?: number;
  status?: ClassEnrollmentStatus;
  q?: string;
}
