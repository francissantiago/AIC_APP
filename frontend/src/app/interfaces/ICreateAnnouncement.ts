import { AnnouncementAudience } from '@enums/announcement-audience';

export interface ICreateAnnouncement {
  title: string;
  body: string;
  audience?: AnnouncementAudience;
  audienceTargets?: string[] | null;
  publishedAt?: string;
  expiresAt?: string | null;
}
