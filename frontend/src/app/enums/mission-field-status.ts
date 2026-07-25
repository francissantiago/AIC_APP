export enum MissionFieldStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export const MISSION_FIELD_STATUSES = [
  MissionFieldStatus.ACTIVE,
  MissionFieldStatus.INACTIVE,
] as const;
