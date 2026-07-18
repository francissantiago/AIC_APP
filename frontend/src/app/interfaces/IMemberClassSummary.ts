import { ClassAgeGroup } from '@enums/class-age-group';
import { ClassEnrollmentStatus } from '@enums/class-enrollment-status';
import { ClassStatus } from '@enums/class-status';

/** Espelha MemberClassSummaryDto do backend. */
export interface IMemberClassSummary {
  id: string;
  name: string;
  ageGroup: ClassAgeGroup;
  status: ClassStatus;
  enrollmentStatus: ClassEnrollmentStatus;
  enrolledAt: string;
}
