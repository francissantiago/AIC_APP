import { FamilyRelation } from '@enums/family-relation';

/** Espelha AddFamilyMemberDto do backend. */
export interface IAddFamilyMember {
  memberId: string;
  relation?: FamilyRelation;
}
