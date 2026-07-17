export enum MemberStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TRANSFERRED = 'transferred',
  DECEASED = 'deceased',
}

export const MEMBER_STATUSES = [
  MemberStatus.ACTIVE,
  MemberStatus.INACTIVE,
  MemberStatus.TRANSFERRED,
  MemberStatus.DECEASED,
] as const;
