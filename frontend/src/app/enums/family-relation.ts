export enum FamilyRelation {
  SPOUSE = 'spouse',
  CHILD = 'child',
  PARENT = 'parent',
  SIBLING = 'sibling',
  OTHER = 'other',
}

export const FAMILY_RELATIONS = [
  FamilyRelation.SPOUSE,
  FamilyRelation.CHILD,
  FamilyRelation.PARENT,
  FamilyRelation.SIBLING,
  FamilyRelation.OTHER,
] as const;
