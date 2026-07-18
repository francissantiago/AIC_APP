import { IScheduleAssignment } from '@interfaces/IScheduleAssignment';

/** Espelha WeekViewResponseDto do backend. */
export interface IScheduleWeekViewMinistryGroup {
  ministryId: string;
  ministryName: string;
  assignments: IScheduleAssignment[];
}

export interface IScheduleWeekViewEvent {
  id: string;
  title: string;
  type: string;
  startsAt: string;
  endsAt: string;
  ministries: IScheduleWeekViewMinistryGroup[];
}

export interface IScheduleWeekView {
  from: string;
  to: string;
  events: IScheduleWeekViewEvent[];
}

export interface IQueryScheduleWeekView {
  from: string;
  to: string;
  ministryId?: string;
  unconfirmedOnly?: boolean;
}
