import { SmallGroupMemberStatus } from '@enums/small-group-member-status';

export interface IQuerySmallGroupMembers {
  page?: number;
  limit?: number;
  status?: SmallGroupMemberStatus;
}
