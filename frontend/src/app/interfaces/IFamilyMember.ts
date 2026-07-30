import { FamilyRelation } from '@enums/family-relation';
import {
  IFamilyMemberRelationBrief,
  IRelationSummarySegment,
} from '@interfaces/IFamilyMemberRelation';

/** Espelha FamilyMemberResponseDto do backend. */
export interface IFamilyMember {
  familyId: string;
  memberId: string;
  memberFullName: string;
  relation: FamilyRelation;
  joinedAt: string;
  birthDate: string | null;
  relationSummarySegments?: IRelationSummarySegment[];
  relations?: IFamilyMemberRelationBrief[];
}
