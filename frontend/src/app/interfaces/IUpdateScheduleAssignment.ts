/** Espelha UpdateScheduleAssignmentDto do backend. */
export interface IUpdateScheduleAssignment {
  roleLabel?: string;
  confirmed?: boolean;
  notes?: string | null;
  memberId?: string;
  ministryId?: string;
}
