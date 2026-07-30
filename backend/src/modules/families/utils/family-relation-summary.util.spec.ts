import {
  buildMemberRelationBriefs,
  buildRelationSummarySegments,
  normalizeSymmetricMemberIds,
} from './family-relation-summary.util';
import { FamilyMemberLinkRelation } from '../enums/family-member-link-relation.enum';

describe('family-relation-summary.util', () => {
  const edges = [
    {
      id: 'e1',
      fromMemberId: 'joao',
      toMemberId: 'felipe',
      relation: FamilyMemberLinkRelation.PARENT_OF,
      fromMemberFullName: 'João',
      toMemberFullName: 'Felipe',
    },
    {
      id: 'e2',
      fromMemberId: 'maria',
      toMemberId: 'felipe',
      relation: FamilyMemberLinkRelation.PARENT_OF,
      fromMemberFullName: 'Maria',
      toMemberFullName: 'Felipe',
    },
    {
      id: 'e3',
      fromMemberId: 'felipe',
      toMemberId: 'marcos',
      relation: FamilyMemberLinkRelation.SIBLING_OF,
      fromMemberFullName: 'Felipe',
      toMemberFullName: 'Marcos',
    },
  ];

  it('builds incoming parent briefs for child', () => {
    const briefs = buildMemberRelationBriefs('felipe', edges);
    expect(briefs).toHaveLength(3);
    expect(briefs.filter((item) => item.direction === 'incoming')).toHaveLength(
      2,
    );
  });

  it('builds summary segments for child with two parents', () => {
    const briefs = buildMemberRelationBriefs('felipe', edges);
    const segments = buildRelationSummarySegments('felipe', briefs);
    expect(
      segments.some((item) => item.key === 'FAMILIES.SUMMARY_CHILD_OF_TWO'),
    ).toBe(true);
  });

  it('does not attribute spouse_of to a third family member', () => {
    const withSpouse = [
      ...edges,
      {
        id: 'e4',
        fromMemberId: 'joao',
        toMemberId: 'maria',
        relation: FamilyMemberLinkRelation.SPOUSE_OF,
        fromMemberFullName: 'João',
        toMemberFullName: 'Maria',
      },
    ];

    const childBriefs = buildMemberRelationBriefs('felipe', withSpouse);
    expect(
      childBriefs.some(
        (item) => item.relation === FamilyMemberLinkRelation.SPOUSE_OF,
      ),
    ).toBe(false);

    const parentBriefs = buildMemberRelationBriefs('joao', withSpouse);
    expect(
      parentBriefs.filter(
        (item) => item.relation === FamilyMemberLinkRelation.SPOUSE_OF,
      ),
    ).toEqual([
      expect.objectContaining({
        relatedMemberId: 'maria',
        relatedMemberFullName: 'Maria',
      }),
    ]);
  });

  it('normalizes symmetric pairs by uuid order', () => {
    const normalized = normalizeSymmetricMemberIds('b-id', 'a-id');
    expect(normalized.fromMemberId).toBe('a-id');
    expect(normalized.toMemberId).toBe('b-id');
  });
});
