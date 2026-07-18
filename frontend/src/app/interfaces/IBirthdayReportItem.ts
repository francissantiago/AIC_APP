import { FamilyRelation } from '@enums/family-relation';

/** Espelha BirthdayReportItemDto do backend. */
export interface IBirthdayReportItem {
  memberId: string;
  fullName: string;
  birthDate: string;
  familyId: string;
  familyName: string;
  relation: FamilyRelation;
  day: number;
}
