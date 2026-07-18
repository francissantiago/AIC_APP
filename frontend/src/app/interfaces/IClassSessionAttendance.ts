import { IClassAttendanceEntry } from '@interfaces/IClassAttendanceEntry';

/** Espelha ClassSessionAttendanceDto do backend. */
export interface IClassSessionAttendance {
  classId: string;
  className: string;
  sessionDate: string;
  entries: IClassAttendanceEntry[];
}
