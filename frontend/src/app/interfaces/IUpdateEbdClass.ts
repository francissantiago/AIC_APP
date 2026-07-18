import { ClassAgeGroup } from '@enums/class-age-group';
import { ClassStatus } from '@enums/class-status';

/** Espelha UpdateClassDto do backend (parcial; null desvincula professor). */
export interface IUpdateEbdClass {
  name?: string;
  description?: string | null;
  ageGroup?: ClassAgeGroup;
  teacherMemberId?: string | null;
  dayOfWeek?: number;
  startTime?: string | null;
  room?: string | null;
  status?: ClassStatus;
}
