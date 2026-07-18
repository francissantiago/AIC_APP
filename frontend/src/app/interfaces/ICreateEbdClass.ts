import { ClassAgeGroup } from '@enums/class-age-group';
import { ClassStatus } from '@enums/class-status';

/** Espelha CreateClassDto do backend. */
export interface ICreateEbdClass {
  name: string;
  description?: string;
  ageGroup?: ClassAgeGroup;
  teacherMemberId?: string | null;
  dayOfWeek?: number;
  startTime?: string;
  room?: string;
  status?: ClassStatus;
}
