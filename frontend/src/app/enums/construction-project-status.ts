export enum ConstructionProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export const CONSTRUCTION_PROJECT_STATUSES = [
  ConstructionProjectStatus.PLANNING,
  ConstructionProjectStatus.IN_PROGRESS,
  ConstructionProjectStatus.PAUSED,
  ConstructionProjectStatus.COMPLETED,
  ConstructionProjectStatus.CANCELLED,
] as const;
