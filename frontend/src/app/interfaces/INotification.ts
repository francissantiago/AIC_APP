export type NotificationType = 'visitor_follow_up' | 'schedule_reminder';

export type NotificationReferenceType = 'visitor' | 'schedule_assignment';

export interface INotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  referenceType: NotificationReferenceType;
  referenceId: string;
  readAt: string | null;
  createdAt: string;
}
