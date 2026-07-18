import { IUpsertClassAttendanceEntry } from '@interfaces/IUpsertClassAttendanceEntry';

/** Espelha UpsertClassAttendanceDto do backend. */
export interface IUpsertClassAttendance {
  sessionDate: string;
  entries: IUpsertClassAttendanceEntry[];
}
