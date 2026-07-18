/** Espelha ScheduleMemberOptionDto + QueryScheduleMemberOptionsDto. */
export interface IScheduleMemberOption {
  id: string;
  fullName: string;
  ministryRole: string;
}

export interface IQueryScheduleMemberOptions {
  ministryId: string;
  q?: string;
  limit?: number;
}
