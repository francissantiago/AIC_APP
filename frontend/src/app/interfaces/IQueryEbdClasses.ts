import { ClassAgeGroup } from '@enums/class-age-group';
import { ClassStatus } from '@enums/class-status';

/** Espelha QueryClassesDto do backend. */
export interface IQueryEbdClasses {
  page?: number;
  limit?: number;
  q?: string;
  status?: ClassStatus;
  ageGroup?: ClassAgeGroup;
  dayOfWeek?: number;
  teacherMemberId?: string;
}
