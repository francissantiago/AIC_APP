import { SmallGroupMemberRole } from '@enums/small-group-member-role';
import { SmallGroupMemberStatus } from '@enums/small-group-member-status';

/** Espelha SmallGroupMemberResponseDto do backend. */
export interface ISmallGroupMember {
  smallGroupId: string;
  memberId: string;
  memberFullName: string;
  role: SmallGroupMemberRole;
  status: SmallGroupMemberStatus;
  joinedAt: string;
}
