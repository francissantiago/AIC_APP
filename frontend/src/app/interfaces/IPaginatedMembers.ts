import { IMember } from '@interfaces/IMember';

/** Espelha PaginatedMembersResponseDto do backend. */
export interface IPaginatedMembers {
  data: IMember[];
  total: number;
  page: number;
  limit: number;
}
