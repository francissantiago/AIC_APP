import { ClassEnrollmentStatus } from '@enums/class-enrollment-status';

export interface IBulkAddClassEnrollments {
  memberIds: string[];
  status?: ClassEnrollmentStatus;
}

export interface IBulkClassEnrollmentsResponse {
  enrolled: number;
  skipped: number;
}
