/** Espelha ScheduleAssignmentResponseDto + summaries do backend. */
export interface IScheduleEventSummary {
  id: string;
  title: string;
  type: string;
  startsAt: string;
  endsAt: string;
}

export interface IScheduleMinistrySummary {
  id: string;
  name: string;
}

export interface IScheduleMemberSummary {
  id: string;
  fullName: string;
}

export interface IScheduleAssignment {
  id: string;
  calendarEventId: string;
  ministryId: string;
  memberId: string;
  roleLabel: string;
  confirmed: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  event: IScheduleEventSummary;
  ministry: IScheduleMinistrySummary;
  member: IScheduleMemberSummary;
}

export interface IPaginatedScheduleAssignments {
  data: IScheduleAssignment[];
  total: number;
  page: number;
  limit: number;
}
