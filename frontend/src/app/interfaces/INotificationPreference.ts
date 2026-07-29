import { NotificationType } from './INotification';

export interface INotificationPreference {
  type: NotificationType;
  enabled: boolean;
}

export interface INotificationPreferencesResponse {
  items: INotificationPreference[];
}

export interface IUpdateNotificationPreferences {
  items: INotificationPreference[];
}
