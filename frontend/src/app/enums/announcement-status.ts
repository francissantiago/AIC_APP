export enum AnnouncementStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  EXPIRED = 'expired',
}

export const ANNOUNCEMENT_STATUSES = [
  AnnouncementStatus.SCHEDULED,
  AnnouncementStatus.ACTIVE,
  AnnouncementStatus.EXPIRED,
] as const;
