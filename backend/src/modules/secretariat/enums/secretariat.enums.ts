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
