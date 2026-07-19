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

export const CALENDAR_EVENT_TYPES = Object.values(CalendarEventType);
export const MANUAL_CALENDAR_EVENT_TYPES = CALENDAR_EVENT_TYPES.filter(
  (type) => type !== CalendarEventType.BIRTHDAY,
);
export const CALENDAR_RECURRENCE_FREQUENCIES = Object.values(CalendarRecurrenceFrequency);
export const ATTENDANCE_EVENT_TYPES = Object.values(AttendanceEventType);
export const SECRETARIAT_DOCUMENT_TYPES = Object.values(SecretariatDocumentType);
export const SECRETARIAT_DOCUMENT_STATUSES = Object.values(SecretariatDocumentStatus);
