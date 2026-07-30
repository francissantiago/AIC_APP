export enum FamilyMemberLinkRelation {
  PARENT_OF = 'parent_of',
  SPOUSE_OF = 'spouse_of',
  SIBLING_OF = 'sibling_of',
}

export const FAMILY_MEMBER_LINK_RELATIONS = [
  FamilyMemberLinkRelation.PARENT_OF,
  FamilyMemberLinkRelation.SPOUSE_OF,
  FamilyMemberLinkRelation.SIBLING_OF,
] as const;
