export enum CongregationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export const CONGREGATION_STATUSES = [
  CongregationStatus.ACTIVE,
  CongregationStatus.INACTIVE,
] as const;
