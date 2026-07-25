export enum MissionAssignmentRole {
  MISSIONARY = 'missionary',
  SUPPORT = 'support',
  SHORT_TERM = 'short_term',
}

export const MISSION_ASSIGNMENT_ROLES = [
  MissionAssignmentRole.MISSIONARY,
  MissionAssignmentRole.SUPPORT,
  MissionAssignmentRole.SHORT_TERM,
] as const;
