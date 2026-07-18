import { IAnnouncement } from './IAnnouncement';

export interface IPaginatedAnnouncements {
  data: IAnnouncement[];
  total: number;
  page: number;
  limit: number;
}

export interface IAnnouncementsBoard {
  data: IAnnouncement[];
}
