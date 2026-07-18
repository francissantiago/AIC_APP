import { MinistryMemberRole } from '@enums/ministry-member-role';

/** Espelha MinistryMemberResponseDto do backend. */
export interface IMinistryMember {
  ministryId: string;
  memberId: string;
  memberFullName: string;
  role: MinistryMemberRole;
  joinedAt: string;
}
