import { IMinistryMember } from '@interfaces/IMinistryMember';

/** Espelha PaginatedMinistryMembersResponseDto do backend. */
export interface IPaginatedMinistryMembers {
  data: IMinistryMember[];
  total: number;
  page: number;
  limit: number;
}
