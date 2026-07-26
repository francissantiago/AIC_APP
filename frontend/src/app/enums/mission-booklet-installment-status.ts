export enum MissionBookletInstallmentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export const MISSION_BOOKLET_INSTALLMENT_STATUSES = Object.values(
  MissionBookletInstallmentStatus,
);
