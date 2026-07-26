export type NotificationType =
  | 'visitor_follow_up'
  | 'schedule_reminder'
  | 'member_birthday'
  | 'construction_update'
  | 'construction_status_change'
  | 'construction_budget_alert'
  | 'social_project_session_created'
  | 'social_project_status_change'
  | 'social_project_budget_alert'
  | 'social_project_participant_added';

export type NotificationReferenceType =
  | 'visitor'
  | 'schedule_assignment'
  | 'member'
  | 'construction_project'
  | 'construction_update'
  | 'social_project'
  | 'social_project_session';

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
