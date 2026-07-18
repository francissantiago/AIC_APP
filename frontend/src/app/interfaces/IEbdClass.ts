import { ClassAgeGroup } from '@enums/class-age-group';
import { ClassStatus } from '@enums/class-status';
import { IClassTeacherSummary } from '@interfaces/IClassTeacherOption';

/** Espelha ClassResponseDto do backend. */
export interface IEbdClass {
  id: string;
  congregationId: string;
  name: string;
  description: string | null;
  ageGroup: ClassAgeGroup;
  teacherMemberId: string | null;
  teacher: IClassTeacherSummary | null;
  dayOfWeek: number;
  startTime: string | null;
  room: string | null;
  status: ClassStatus;
  enrollmentsCount?: number;
  createdAt: string;
  updatedAt: string;
}
