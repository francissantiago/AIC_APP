import { FamilyRelation } from '@enums/family-relation';

/** Espelha FamilyMemberResponseDto do backend. */
export interface IFamilyMember {
  familyId: string;
  memberId: string;
  memberFullName: string;
  relation: FamilyRelation;
  joinedAt: string;
  birthDate: string | null;
}
