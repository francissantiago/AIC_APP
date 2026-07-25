export type NotificationType =
  | 'visitor_follow_up'
  | 'schedule_reminder'
  | 'member_birthday'
  | 'construction_update'
  | 'construction_status_change'
  | 'construction_budget_alert';

export type NotificationReferenceType =
  | 'visitor'
  | 'schedule_assignment'
  | 'member'
  | 'construction_project'
  | 'construction_update';

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
