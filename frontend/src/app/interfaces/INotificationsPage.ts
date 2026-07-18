import type { INotification } from './INotification';

export interface INotificationsPage {
  data: INotification[];
  total: number;
  page: number;
  limit: number;
}
