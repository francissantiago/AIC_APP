import { MemberGender } from '@enums/member-gender';
import { MemberStatus } from '@enums/member-status';

/** Espelha QueryMembersDto do backend. */
export interface IQueryMembers {
  page?: number;
  limit?: number;
  status?: MemberStatus;
  gender?: MemberGender;
  q?: string;
}
