export enum MemberTransferStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export const MEMBER_TRANSFER_STATUSES = [
  MemberTransferStatus.PENDING,
  MemberTransferStatus.COMPLETED,
  MemberTransferStatus.CANCELLED,
] as const;
