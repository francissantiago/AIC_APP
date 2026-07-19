export type NotificationType =
  | 'visitor_follow_up'
  | 'schedule_reminder'
  | 'member_birthday';

export type NotificationReferenceType =
  | 'visitor'
  | 'schedule_assignment'
  | 'member';

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
