import type { NotificationType } from './INotification';

export interface INotificationNewEvent {
  id: string;
  type: NotificationType;
  title: string;
  createdAt: string;
}
