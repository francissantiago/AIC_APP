export enum ClassStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export const CLASS_STATUSES = [ClassStatus.ACTIVE, ClassStatus.INACTIVE] as const;
