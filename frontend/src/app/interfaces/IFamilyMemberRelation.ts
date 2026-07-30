import { FamilyMemberLinkRelation } from '@enums/family-member-link-relation';

export interface IRelationSummarySegment {
  key: string;
  params: Record<string, string>;
}

export interface IFamilyMemberRelationBrief {
  id: string;
  relation: FamilyMemberLinkRelation;
  relatedMemberId: string;
  relatedMemberFullName: string;
  direction: 'outgoing' | 'incoming';
}

export interface IFamilyMemberRelation {
  id: string;
  familyId: string;
  fromMemberId: string;
  fromMemberFullName: string;
  toMemberId: string;
  toMemberFullName: string;
  relation: FamilyMemberLinkRelation;
  createdAt: string;
}

export interface ICreateFamilyMemberRelation {
  fromMemberId: string;
  toMemberId: string;
  relation: FamilyMemberLinkRelation;
}

export interface IFamilyMemberRelationList {
  data: IFamilyMemberRelation[];
}
