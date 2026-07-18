import { SmallGroupMemberRole } from '@enums/small-group-member-role';
import { SmallGroupMemberStatus } from '@enums/small-group-member-status';

export interface IAddSmallGroupMember {
  memberId: string;
  role?: SmallGroupMemberRole;
  status?: SmallGroupMemberStatus;
  joinedAt?: string;
}
