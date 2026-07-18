/** Espelha UpsertClassAttendanceEntryDto do backend. */
export interface IUpsertClassAttendanceEntry {
  memberId: string;
  present: boolean;
  notes?: string | null;
}
