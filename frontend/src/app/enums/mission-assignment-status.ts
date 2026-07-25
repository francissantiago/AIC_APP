export enum MissionAssignmentStatus {
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export const MISSION_ASSIGNMENT_STATUSES = [
  MissionAssignmentStatus.ACTIVE,
  MissionAssignmentStatus.ON_LEAVE,
  MissionAssignmentStatus.COMPLETED,
  MissionAssignmentStatus.CANCELLED,
] as const;
