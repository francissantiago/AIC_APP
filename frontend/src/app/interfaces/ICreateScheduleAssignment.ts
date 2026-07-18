/** Espelha CreateScheduleAssignmentDto do backend. */
export interface ICreateScheduleAssignment {
  calendarEventId: string;
  ministryId: string;
  memberId: string;
  roleLabel: string;
  confirmed?: boolean;
  notes?: string | null;
}
