import { FamilyMemberLinkRelation } from '../enums/family-member-link-relation.enum';
import { buildGenealogyForest } from './family-genealogy.util';

describe('family-genealogy.util', () => {
  it('builds couple with shared children and isolates unlinked members', () => {
    const forest = buildGenealogyForest(
      [
        { memberId: 'henrique', fullName: 'Henrique', birthDate: null },
        { memberId: 'renata', fullName: 'Renata', birthDate: null },
        { memberId: 'sofia', fullName: 'Sofia', birthDate: '2010-01-01' },
        { memberId: 'tio', fullName: 'Tio Sem Vinculo', birthDate: null },
      ],
      [
        {
          fromMemberId: 'henrique',
          toMemberId: 'sofia',
          relation: FamilyMemberLinkRelation.PARENT_OF,
        },
        {
          fromMemberId: 'renata',
          toMemberId: 'sofia',
          relation: FamilyMemberLinkRelation.PARENT_OF,
        },
        {
          fromMemberId: 'henrique',
          toMemberId: 'renata',
          relation: FamilyMemberLinkRelation.SPOUSE_OF,
        },
      ],
    );

    expect(forest.roots).toHaveLength(1);
    const root = forest.roots[0];
    expect(root.spouses.map((spouse) => spouse.memberId)).toContain('renata');
    expect(root.children).toHaveLength(1);
    expect(root.children[0].memberId).toBe('sofia');
    expect(forest.unlinkedMembers.map((item) => item.memberId)).toEqual([
      'tio',
    ]);
  });

  it('attaches sibling of a spouse in the couple generation', () => {
    const forest = buildGenealogyForest(
      [
        { memberId: 'henrique', fullName: 'Henrique', birthDate: null },
        { memberId: 'renata', fullName: 'Renata', birthDate: null },
        { memberId: 'marcelo', fullName: 'Marcelo', birthDate: null },
        { memberId: 'sofia', fullName: 'Sofia', birthDate: null },
      ],
      [
        {
          fromMemberId: 'henrique',
          toMemberId: 'sofia',
          relation: FamilyMemberLinkRelation.PARENT_OF,
        },
        {
          fromMemberId: 'renata',
          toMemberId: 'sofia',
          relation: FamilyMemberLinkRelation.PARENT_OF,
        },
        {
          fromMemberId: 'henrique',
          toMemberId: 'renata',
          relation: FamilyMemberLinkRelation.SPOUSE_OF,
        },
        {
          fromMemberId: 'renata',
          toMemberId: 'marcelo',
          relation: FamilyMemberLinkRelation.SIBLING_OF,
        },
      ],
    );

    expect(forest.roots).toHaveLength(1);
    const root = forest.roots[0];
    const renata = root.spouses.find((spouse) => spouse.memberId === 'renata');
    expect(renata?.siblings.map((sibling) => sibling.memberId)).toEqual([
      'marcelo',
    ]);
    expect(forest.unlinkedMembers).toEqual([]);
  });

  it('does not duplicate child under both parents when they are spouses', () => {
    const forest = buildGenealogyForest(
      [
        { memberId: 'a', fullName: 'A', birthDate: null },
        { memberId: 'b', fullName: 'B', birthDate: null },
        { memberId: 'c', fullName: 'C', birthDate: null },
      ],
      [
        {
          fromMemberId: 'a',
          toMemberId: 'c',
          relation: FamilyMemberLinkRelation.PARENT_OF,
        },
        {
          fromMemberId: 'b',
          toMemberId: 'c',
          relation: FamilyMemberLinkRelation.PARENT_OF,
        },
        {
          fromMemberId: 'a',
          toMemberId: 'b',
          relation: FamilyMemberLinkRelation.SPOUSE_OF,
        },
      ],
    );

    expect(forest.roots).toHaveLength(1);
    expect(forest.roots[0].children).toHaveLength(1);
  });
});
