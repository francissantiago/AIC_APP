export enum CalendarEventType {
  SERVICE = 'service',
  MEETING = 'meeting',
  REHEARSAL = 'rehearsal',
  WEDDING = 'wedding',
  OTHER = 'other',
  BIRTHDAY = 'birthday',
}

export enum CalendarRecurrenceFrequency {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum AttendanceEventType {
  SERVICE = 'service',
  MEETING = 'meeting',
  REHEARSAL = 'rehearsal',
  OTHER = 'other',
}

export enum SecretariatDocumentType {
  MINUTES = 'minutes',
  LETTER = 'letter',
  CERTIFICATE = 'certificate',
  OTHER = 'other',
}

export enum SecretariatDocumentStatus {
  DRAFT = 'draft',
  FINAL = 'final',
}

export enum GoogleCalendarSyncDirection {
  BIDIRECTIONAL = 'bidirectional',
  AIC_TO_GOOGLE = 'aic_to_google',
  GOOGLE_TO_AIC = 'google_to_aic',
}

export enum GoogleCalendarConflictPolicy {
  AIC_WINS = 'aic_wins',
  GOOGLE_WINS = 'google_wins',
  LATEST_WINS = 'latest_wins',
}

export enum GoogleCalendarConnectionStatus {
  ACTIVE = 'active',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  REVOKED = 'revoked',
}
