import { ISmallGroupMember } from '@interfaces/ISmallGroupMember';

export interface IPaginatedSmallGroupMembers {
  data: ISmallGroupMember[];
  total: number;
  page: number;
  limit: number;
}
