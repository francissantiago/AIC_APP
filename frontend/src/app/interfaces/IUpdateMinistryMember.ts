import { MinistryMemberRole } from '@enums/ministry-member-role';

/** Espelha UpdateMinistryMemberDto do backend. */
export interface IUpdateMinistryMember {
  role: MinistryMemberRole;
}
