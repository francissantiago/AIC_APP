import {
  AttendanceEventType,
  CalendarEventType,
  CalendarRecurrenceFrequency,
  SecretariatDocumentStatus,
  SecretariatDocumentType,
} from '@enums/secretariat';
import { IMember } from '@interfaces/IMember';

export interface IPaginationQuery {
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Calendar Events
// ---------------------------------------------------------------------------

export interface ICalendarEvent {
  id: string;
  seriesId: string;
  congregationId: string;
  createdByUserId: string;
  title: string;
  type: CalendarEventType;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  location: string | null;
  description: string | null;
  recurrenceFrequency: CalendarRecurrenceFrequency;
  recurrenceInterval: number;
  recurrenceUntil: string | null;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateCalendarEvent {
  title: string;
  type: CalendarEventType;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  location?: string | null;
  description?: string | null;
  recurrenceFrequency?: CalendarRecurrenceFrequency;
  recurrenceInterval?: number;
  recurrenceUntil?: string | null;
}

export type IUpdateCalendarEvent = Partial<ICreateCalendarEvent>;

export interface ICalendarEventsQuery extends IPaginationQuery {
  from?: string;
  to?: string;
  type?: CalendarEventType;
}

export interface IPaginatedCalendarEvents {
  data: ICalendarEvent[];
  total: number;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// Visitors
// ---------------------------------------------------------------------------

export interface IVisitor {
  id: string;
  congregationId: string;
  createdByUserId: string;
  fullName: string;
  phone: string | null;
  visitDate: string;
  notes: string | null;
  followUpDone: boolean;
  memberId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateVisitor {
  fullName: string;
  phone?: string | null;
  visitDate: string;
  notes?: string | null;
  followUpDone?: boolean;
  memberId?: string | null;
}

export type IUpdateVisitor = Partial<ICreateVisitor>;

export interface IVisitorsQuery extends IPaginationQuery {
  from?: string;
  to?: string;
  followUpDone?: boolean;
  search?: string;
}

export interface IPaginatedVisitors {
  data: IVisitor[];
  total: number;
  page: number;
  limit: number;
}

export interface IConvertVisitorToMember {
  fullName?: string;
  phone?: string | null;
  email?: string;
  document?: string;
  membershipDate?: string;
  baptismDate?: string;
  notes?: string;
}

export interface IConvertVisitorToMemberResponse {
  visitor: IVisitor;
  member: IMember;
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export interface IAttendanceRecord {
  id: string;
  congregationId: string;
  createdByUserId: string;
  eventDate: string;
  eventType: AttendanceEventType;
  calendarEventId: string | null;
  totalPresent: number;
  adults: number | null;
  children: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateAttendanceRecord {
  eventDate: string;
  eventType: AttendanceEventType;
  calendarEventId?: string | null;
  totalPresent: number;
  adults?: number | null;
  children?: number | null;
  notes?: string | null;
}

export type IUpdateAttendanceRecord = Partial<ICreateAttendanceRecord>;

export interface IAttendanceQuery extends IPaginationQuery {
  from?: string;
  to?: string;
  eventType?: AttendanceEventType;
}

export interface IPaginatedAttendance {
  data: IAttendanceRecord[];
  total: number;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export interface ISecretariatDocument {
  id: string;
  congregationId: string;
  createdByUserId: string;
  title: string;
  type: SecretariatDocumentType;
  documentDate: string;
  summary: string | null;
  status: SecretariatDocumentStatus;
  hasAttachment: boolean;
  originalFilename: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateSecretariatDocument {
  title: string;
  type: SecretariatDocumentType;
  documentDate: string;
  summary?: string | null;
  status?: SecretariatDocumentStatus;
}

export type IUpdateSecretariatDocument = Partial<ICreateSecretariatDocument>;

export interface ISecretariatDocumentsQuery extends IPaginationQuery {
  type?: SecretariatDocumentType;
  status?: SecretariatDocumentStatus;
  from?: string;
  to?: string;
  search?: string;
}

export interface IPaginatedSecretariatDocuments {
  data: ISecretariatDocument[];
  total: number;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface IUpcomingEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  startsAt: string;
  location: string | null;
}

export interface IBirthday {
  id: string;
  fullName: string;
  birthDate: string;
}

export interface IAttendanceByMonth {
  month: string;
  total: number;
}

export interface IVisitorsByMonth {
  month: string;
  total: number;
}

export interface ISecretariatDashboard {
  upcomingEventsCount: number;
  upcomingEvents: IUpcomingEvent[];
  visitorsThisMonth: number;
  pendingFollowUps: number;
  lastAttendanceTotal: number | null;
  lastAttendanceDate: string | null;
  birthdaysThisWeek: IBirthday[];
  attendanceByMonth: IAttendanceByMonth[];
  visitorsByMonth: IVisitorsByMonth[];
}
