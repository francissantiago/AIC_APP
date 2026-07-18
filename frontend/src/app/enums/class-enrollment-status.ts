export enum ClassEnrollmentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TRANSFERRED = 'transferred',
}

export const CLASS_ENROLLMENT_STATUSES = [
  ClassEnrollmentStatus.ACTIVE,
  ClassEnrollmentStatus.INACTIVE,
  ClassEnrollmentStatus.TRANSFERRED,
] as const;
