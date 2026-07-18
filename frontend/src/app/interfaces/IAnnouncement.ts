import { AnnouncementAudience } from '@enums/announcement-audience';
import { AnnouncementStatus } from '@enums/announcement-status';

export interface IAnnouncement {
  id: string;
  congregationId: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  audienceTargets: string[] | null;
  publishedAt: string;
  expiresAt: string | null;
  authorUserId: string;
  authorFullName: string;
  status: AnnouncementStatus;
  createdAt: string;
  updatedAt: string;
}
