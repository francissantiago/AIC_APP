import { SmallGroupMemberRole } from '@enums/small-group-member-role';
import { SmallGroupMemberStatus } from '@enums/small-group-member-status';

export interface IUpdateSmallGroupMember {
  role?: SmallGroupMemberRole;
  status?: SmallGroupMemberStatus;
}
