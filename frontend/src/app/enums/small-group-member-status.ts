export enum SmallGroupMemberStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export const SMALL_GROUP_MEMBER_STATUSES = [
  SmallGroupMemberStatus.ACTIVE,
  SmallGroupMemberStatus.INACTIVE,
] as const;
