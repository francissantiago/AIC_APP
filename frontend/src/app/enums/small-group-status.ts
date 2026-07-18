export enum SmallGroupStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export const SMALL_GROUP_STATUSES = [SmallGroupStatus.ACTIVE, SmallGroupStatus.INACTIVE] as const;
