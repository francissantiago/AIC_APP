import { FamilyRelation } from '@enums/family-relation';

/** Espelha UpdateFamilyMemberDto do backend. */
export interface IUpdateFamilyMember {
  relation: FamilyRelation;
}
