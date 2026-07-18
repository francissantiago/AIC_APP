export enum CalendarEventType {
  SERVICE = 'service',
  MEETING = 'meeting',
  REHEARSAL = 'rehearsal',
  WEDDING = 'wedding',
  OTHER = 'other',
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
export const ATTENDANCE_EVENT_TYPES = Object.values(AttendanceEventType);
export const SECRETARIAT_DOCUMENT_TYPES = Object.values(SecretariatDocumentType);
export const SECRETARIAT_DOCUMENT_STATUSES = Object.values(SecretariatDocumentStatus);
