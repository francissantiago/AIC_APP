import { FamilyMemberLinkRelation } from '../enums/family-member-link-relation.enum';

export type FamilyRelationDirection = 'outgoing' | 'incoming';

export interface FamilyMemberRelationBrief {
  id: string;
  relation: FamilyMemberLinkRelation;
  relatedMemberId: string;
  relatedMemberFullName: string;
  direction: FamilyRelationDirection;
}

export interface RelationSummarySegment {
  key: string;
  params: Record<string, string>;
}

interface StoredRelation {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  relation: FamilyMemberLinkRelation;
  fromMemberFullName: string;
  toMemberFullName: string;
}

export function buildMemberRelationBriefs(
  memberId: string,
  relations: StoredRelation[],
): FamilyMemberRelationBrief[] {
  const briefs: FamilyMemberRelationBrief[] = [];

  for (const edge of relations) {
    if (edge.relation === FamilyMemberLinkRelation.PARENT_OF) {
      if (edge.fromMemberId === memberId) {
        briefs.push({
          id: edge.id,
          relation: edge.relation,
          relatedMemberId: edge.toMemberId,
          relatedMemberFullName: edge.toMemberFullName,
          direction: 'outgoing',
        });
      } else if (edge.toMemberId === memberId) {
        briefs.push({
          id: edge.id,
          relation: edge.relation,
          relatedMemberId: edge.fromMemberId,
          relatedMemberFullName: edge.fromMemberFullName,
          direction: 'incoming',
        });
      }
      continue;
    }

    if (
      edge.relation === FamilyMemberLinkRelation.SPOUSE_OF ||
      edge.relation === FamilyMemberLinkRelation.SIBLING_OF
    ) {
      // Somente os dois extremos da aresta recebem o vínculo.
      if (
        edge.fromMemberId !== memberId &&
        edge.toMemberId !== memberId
      ) {
        continue;
      }
      if (edge.fromMemberId === edge.toMemberId) {
        continue;
      }
      const otherMemberId =
        edge.fromMemberId === memberId ? edge.toMemberId : edge.fromMemberId;
      const otherName =
        edge.fromMemberId === memberId
          ? edge.toMemberFullName
          : edge.fromMemberFullName;
      briefs.push({
        id: edge.id,
        relation: edge.relation,
        relatedMemberId: otherMemberId,
        relatedMemberFullName: otherName,
        direction: 'outgoing',
      });
    }
  }

  return briefs;
}

export function buildRelationSummarySegments(
  memberId: string,
  briefs: FamilyMemberRelationBrief[],
): RelationSummarySegment[] {
  const segments: RelationSummarySegment[] = [];

  const parents = briefs.filter(
    (item) =>
      item.relation === FamilyMemberLinkRelation.PARENT_OF &&
      item.direction === 'incoming',
  );
  if (parents.length === 1) {
    segments.push({
      key: 'FAMILIES.SUMMARY_CHILD_OF_ONE',
      params: { parent: parents[0].relatedMemberFullName },
    });
  } else if (parents.length === 2) {
    segments.push({
      key: 'FAMILIES.SUMMARY_CHILD_OF_TWO',
      params: {
        parent1: parents[0].relatedMemberFullName,
        parent2: parents[1].relatedMemberFullName,
      },
    });
  } else if (parents.length > 2) {
    segments.push({
      key: 'FAMILIES.SUMMARY_CHILD_OF_MANY',
      params: {
        names: parents.map((item) => item.relatedMemberFullName).join(', '),
      },
    });
  }

  const children = briefs.filter(
    (item) =>
      item.relation === FamilyMemberLinkRelation.PARENT_OF &&
      item.direction === 'outgoing',
  );
  if (children.length > 0) {
    segments.push({
      key: 'FAMILIES.SUMMARY_PARENT_OF',
      params: {
        names: children.map((item) => item.relatedMemberFullName).join(', '),
      },
    });
  }

  for (const spouse of briefs.filter(
    (item) => item.relation === FamilyMemberLinkRelation.SPOUSE_OF,
  )) {
    segments.push({
      key: 'FAMILIES.SUMMARY_SPOUSE_OF',
      params: { name: spouse.relatedMemberFullName },
    });
  }

  for (const sibling of briefs.filter(
    (item) => item.relation === FamilyMemberLinkRelation.SIBLING_OF,
  )) {
    segments.push({
      key: 'FAMILIES.SUMMARY_SIBLING_OF',
      params: { name: sibling.relatedMemberFullName },
    });
  }

  void memberId;
  return segments;
}

export function normalizeSymmetricMemberIds(
  memberA: string,
  memberB: string,
): { fromMemberId: string; toMemberId: string } {
  return memberA < memberB
    ? { fromMemberId: memberA, toMemberId: memberB }
    : { fromMemberId: memberB, toMemberId: memberA };
}
