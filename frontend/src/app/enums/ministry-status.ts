export enum MinistryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export const MINISTRY_STATUSES = [MinistryStatus.ACTIVE, MinistryStatus.INACTIVE] as const;
