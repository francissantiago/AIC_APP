import { MinistryMemberRole } from '@enums/ministry-member-role';

/** Espelha AddMinistryMemberDto do backend. */
export interface IAddMinistryMember {
  memberId: string;
  role?: MinistryMemberRole;
  joinedAt?: string;
}
