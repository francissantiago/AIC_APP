/** Espelha FamilyLinkResultDto do backend. */
export type FamilyLinkSkippedReason =
  'PARENTS_IN_DIFFERENT_FAMILIES' | 'CHILD_IN_OTHER_FAMILY' | 'MEMBER_ALREADY_IN_OTHER_FAMILY';

export interface IFamilyLinkResult {
  attempted: boolean;
  linked: boolean;
  familyId?: string;
  familyName?: string;
  skippedReason?: FamilyLinkSkippedReason;
}
