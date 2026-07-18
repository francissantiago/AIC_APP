import { IFamilyMember } from '@interfaces/IFamilyMember';

/** Espelha PaginatedFamilyMembersResponseDto do backend. */
export interface IPaginatedFamilyMembers {
  data: IFamilyMember[];
  total: number;
  page: number;
  limit: number;
}
