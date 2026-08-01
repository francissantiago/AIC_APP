import { FamilyMemberLinkRelation } from '../enums/family-member-link-relation.enum';

export interface GenealogyMemberInput {
  memberId: string;
  fullName: string;
  birthDate: string | null;
}

export interface GenealogyRelationInput {
  fromMemberId: string;
  toMemberId: string;
  relation: FamilyMemberLinkRelation;
}

export interface GenealogyPersonCard {
  memberId: string;
  fullName: string;
  birthDate: string | null;
}

export interface GenealogySpouseNode extends GenealogyPersonCard {
  siblings: GenealogyPersonCard[];
}

export interface GenealogyTreeNode {
  memberId: string;
  fullName: string;
  birthDate: string | null;
  siblings: GenealogyPersonCard[];
  spouses: GenealogySpouseNode[];
  children: GenealogyTreeNode[];
}

export interface GenealogyForest {
  roots: GenealogyTreeNode[];
  unlinkedMembers: GenealogyPersonCard[];
}

export function buildGenealogyForest(
  members: GenealogyMemberInput[],
  relations: GenealogyRelationInput[],
): GenealogyForest {
  const byId = new Map(members.map((member) => [member.memberId, member]));
  const childrenByParent = new Map<string, Set<string>>();
  const parentsByChild = new Map<string, Set<string>>();
  const spousesByMember = new Map<string, Set<string>>();
  const siblingsByMember = new Map<string, Set<string>>();

  for (const edge of relations) {
    if (!byId.has(edge.fromMemberId) || !byId.has(edge.toMemberId)) {
      continue;
    }

    if (edge.relation === FamilyMemberLinkRelation.PARENT_OF) {
      if (!childrenByParent.has(edge.fromMemberId)) {
        childrenByParent.set(edge.fromMemberId, new Set());
      }
      childrenByParent.get(edge.fromMemberId)!.add(edge.toMemberId);

      if (!parentsByChild.has(edge.toMemberId)) {
        parentsByChild.set(edge.toMemberId, new Set());
      }
      parentsByChild.get(edge.toMemberId)!.add(edge.fromMemberId);
      continue;
    }

    if (edge.relation === FamilyMemberLinkRelation.SPOUSE_OF) {
      addSymmetric(spousesByMember, edge.fromMemberId, edge.toMemberId);
      continue;
    }

    if (edge.relation === FamilyMemberLinkRelation.SIBLING_OF) {
      addSymmetric(siblingsByMember, edge.fromMemberId, edge.toMemberId);
    }
  }

  const hasTreeEdge = (memberId: string): boolean =>
    (childrenByParent.get(memberId)?.size ?? 0) > 0 ||
    (parentsByChild.get(memberId)?.size ?? 0) > 0 ||
    (spousesByMember.get(memberId)?.size ?? 0) > 0 ||
    (siblingsByMember.get(memberId)?.size ?? 0) > 0;

  const rootScore = (memberId: string): number =>
    (spousesByMember.get(memberId)?.size ?? 0) * 2 +
    (childrenByParent.get(memberId)?.size ?? 0);

  const rootIds = members
    .map((member) => member.memberId)
    .filter(
      (memberId) =>
        (parentsByChild.get(memberId)?.size ?? 0) === 0 &&
        hasTreeEdge(memberId),
    )
    .sort((a, b) => {
      const scoreDiff = rootScore(b) - rootScore(a);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return (byId.get(a)?.fullName ?? '').localeCompare(
        byId.get(b)?.fullName ?? '',
      );
    });

  const placedAsDescendant = new Set<string>();
  const consumedAsSpouse = new Set<string>();
  const consumedAsSibling = new Set<string>();
  const roots: GenealogyTreeNode[] = [];

  for (const rootId of rootIds) {
    if (
      consumedAsSpouse.has(rootId) ||
      placedAsDescendant.has(rootId) ||
      consumedAsSibling.has(rootId)
    ) {
      continue;
    }

    const node = buildNode(
      rootId,
      byId,
      childrenByParent,
      spousesByMember,
      siblingsByMember,
      placedAsDescendant,
      consumedAsSpouse,
      consumedAsSibling,
      new Set<string>(),
    );
    if (node) {
      roots.push(node);
    }
  }

  const placedIds = new Set<string>();
  for (const root of roots) {
    collectPlacedIds(root, placedIds);
  }

  const unlinkedMembers = members
    .filter((member) => !placedIds.has(member.memberId))
    .filter((member) => !hasTreeEdge(member.memberId))
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((member) => toPersonCard(member));

  return { roots, unlinkedMembers };
}

function addSymmetric(
  map: Map<string, Set<string>>,
  a: string,
  b: string,
): void {
  if (!map.has(a)) {
    map.set(a, new Set());
  }
  if (!map.has(b)) {
    map.set(b, new Set());
  }
  map.get(a)!.add(b);
  map.get(b)!.add(a);
}

function toPersonCard(member: GenealogyMemberInput): GenealogyPersonCard {
  return {
    memberId: member.memberId,
    fullName: member.fullName,
    birthDate: member.birthDate,
  };
}

function collectPlacedIds(node: GenealogyTreeNode, into: Set<string>): void {
  into.add(node.memberId);
  for (const sibling of node.siblings) {
    into.add(sibling.memberId);
  }
  for (const spouse of node.spouses) {
    into.add(spouse.memberId);
    for (const sibling of spouse.siblings) {
      into.add(sibling.memberId);
    }
  }
  for (const child of node.children) {
    collectPlacedIds(child, into);
  }
}

function resolveSiblings(
  memberId: string,
  byId: Map<string, GenealogyMemberInput>,
  siblingsByMember: Map<string, Set<string>>,
  spousesByMember: Map<string, Set<string>>,
  childrenByParent: Map<string, Set<string>>,
  excludeIds: Set<string>,
  consumedAsSibling: Set<string>,
): GenealogyPersonCard[] {
  return [...(siblingsByMember.get(memberId) ?? [])]
    .filter((siblingId) => {
      if (!byId.has(siblingId) || excludeIds.has(siblingId)) {
        return false;
      }
      // Não "roubar" quem é raiz de casal/filhos — eles entram como dorso da árvore.
      const hasOwnBranch =
        (spousesByMember.get(siblingId)?.size ?? 0) > 0 ||
        (childrenByParent.get(siblingId)?.size ?? 0) > 0;
      return !hasOwnBranch;
    })
    .sort((a, b) =>
      (byId.get(a)?.fullName ?? '').localeCompare(byId.get(b)?.fullName ?? ''),
    )
    .map((siblingId) => {
      consumedAsSibling.add(siblingId);
      return toPersonCard(byId.get(siblingId)!);
    });
}

function buildNode(
  memberId: string,
  byId: Map<string, GenealogyMemberInput>,
  childrenByParent: Map<string, Set<string>>,
  spousesByMember: Map<string, Set<string>>,
  siblingsByMember: Map<string, Set<string>>,
  placedAsDescendant: Set<string>,
  consumedAsSpouse: Set<string>,
  consumedAsSibling: Set<string>,
  stack: Set<string>,
): GenealogyTreeNode | null {
  const member = byId.get(memberId);
  if (!member || stack.has(memberId)) {
    return null;
  }

  stack.add(memberId);

  const spouseIds = [...(spousesByMember.get(memberId) ?? [])]
    .filter((spouseId) => byId.has(spouseId) && !stack.has(spouseId))
    .sort((a, b) =>
      (byId.get(a)?.fullName ?? '').localeCompare(byId.get(b)?.fullName ?? ''),
    );

  const coupleExclude = new Set<string>([memberId, ...spouseIds]);

  const siblings = resolveSiblings(
    memberId,
    byId,
    siblingsByMember,
    spousesByMember,
    childrenByParent,
    coupleExclude,
    consumedAsSibling,
  );

  const spouses: GenealogySpouseNode[] = spouseIds.map((spouseId) => {
    consumedAsSpouse.add(spouseId);
    const spouse = byId.get(spouseId)!;
    const spouseExclude = new Set<string>([
      ...coupleExclude,
      ...siblings.map((item) => item.memberId),
    ]);
    return {
      ...toPersonCard(spouse),
      siblings: resolveSiblings(
        spouseId,
        byId,
        siblingsByMember,
        spousesByMember,
        childrenByParent,
        spouseExclude,
        consumedAsSibling,
      ),
    };
  });

  const childIds = new Set<string>([...(childrenByParent.get(memberId) ?? [])]);
  for (const spouseId of spouseIds) {
    for (const childId of childrenByParent.get(spouseId) ?? []) {
      childIds.add(childId);
    }
  }

  const children = [...childIds]
    .filter((childId) => byId.has(childId) && !placedAsDescendant.has(childId))
    .sort((a, b) =>
      (byId.get(a)?.fullName ?? '').localeCompare(byId.get(b)?.fullName ?? ''),
    )
    .map((childId) => {
      placedAsDescendant.add(childId);
      return buildNode(
        childId,
        byId,
        childrenByParent,
        spousesByMember,
        siblingsByMember,
        placedAsDescendant,
        consumedAsSpouse,
        consumedAsSibling,
        stack,
      );
    })
    .filter((child): child is GenealogyTreeNode => child !== null);

  stack.delete(memberId);

  return {
    memberId: member.memberId,
    fullName: member.fullName,
    birthDate: member.birthDate,
    siblings,
    spouses,
    children,
  };
}
