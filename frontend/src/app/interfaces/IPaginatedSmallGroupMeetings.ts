import { ISmallGroupMeeting } from '@interfaces/ISmallGroupMeeting';

export interface IPaginatedSmallGroupMeetings {
  data: ISmallGroupMeeting[];
  total: number;
  page: number;
  limit: number;
}
