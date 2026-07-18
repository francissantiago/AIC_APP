/** Espelha QueryScheduleAssignmentsDto do backend. */
export interface IQueryScheduleAssignments {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  calendarEventId?: string;
  ministryId?: string;
  memberId?: string;
  confirmed?: boolean;
}
