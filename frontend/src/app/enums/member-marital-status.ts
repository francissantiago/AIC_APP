export enum MemberMaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed',
  OTHER = 'other',
}

export const MEMBER_MARITAL_STATUSES = [
  MemberMaritalStatus.SINGLE,
  MemberMaritalStatus.MARRIED,
  MemberMaritalStatus.DIVORCED,
  MemberMaritalStatus.WIDOWED,
  MemberMaritalStatus.OTHER,
] as const;
