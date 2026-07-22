import { MemberGender } from '@enums/member-gender';
import { MemberStatus } from '@enums/member-status';

/** Espelha MemberOptionDto do backend. */
export interface IMemberOption {
  id: string;
  fullName: string;
  status?: MemberStatus;
  gender?: MemberGender;
}

export interface IQueryMemberOptions {
  q: string;
  limit?: number;
  excludeMemberId?: string;
}
