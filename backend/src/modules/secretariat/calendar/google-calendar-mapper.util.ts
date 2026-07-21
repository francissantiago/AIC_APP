import { calendar_v3 } from 'googleapis';
import {
  CalendarEventType,
  CalendarRecurrenceFrequency,
} from '../enums/secretariat.enums';
import { CalendarEvent } from './entities/calendar-event.entity';
import { sha256Hex } from './google-calendar-crypto.util';

export interface AicEventMappedFields {
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  type: CalendarEventType;
  recurrenceFrequency: CalendarRecurrenceFrequency;
  recurrenceInterval: number;
  recurrenceUntil: string | null;
}

export interface GooglePullMapResult {
  fields: AicEventMappedFields;
  warnings: string[];
}

const FREQ_TO_GOOGLE: Record<
  Exclude<CalendarRecurrenceFrequency, CalendarRecurrenceFrequency.NONE>,
  string
> = {
  [CalendarRecurrenceFrequency.DAILY]: 'DAILY',
  [CalendarRecurrenceFrequency.WEEKLY]: 'WEEKLY',
  [CalendarRecurrenceFrequency.MONTHLY]: 'MONTHLY',
  [CalendarRecurrenceFrequency.YEARLY]: 'YEARLY',
};

const GOOGLE_TO_FREQ: Record<string, CalendarRecurrenceFrequency> = {
  DAILY: CalendarRecurrenceFrequency.DAILY,
  WEEKLY: CalendarRecurrenceFrequency.WEEKLY,
  MONTHLY: CalendarRecurrenceFrequency.MONTHLY,
  YEARLY: CalendarRecurrenceFrequency.YEARLY,
};

function toIsoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addOneDayIso(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return toIsoDateOnly(date);
}

function untilToRrule(until: string): string {
  return until.replace(/-/g, '') + 'T235959Z';
}

export function buildGoogleRecurrence(
  event: Pick<
    CalendarEvent,
    'recurrenceFrequency' | 'recurrenceInterval' | 'recurrenceUntil'
  >,
): string[] | undefined {
  if (event.recurrenceFrequency === CalendarRecurrenceFrequency.NONE) {
    return undefined;
  }
  const parts = [
    `FREQ=${FREQ_TO_GOOGLE[event.recurrenceFrequency]}`,
    `INTERVAL=${Math.max(1, event.recurrenceInterval || 1)}`,
  ];
  if (event.recurrenceUntil) {
    parts.push(`UNTIL=${untilToRrule(event.recurrenceUntil)}`);
  }
  return [`RRULE:${parts.join(';')}`];
}

export function mapAicEventToGoogleResource(
  event: CalendarEvent,
  timeZone: string,
): calendar_v3.Schema$Event {
  const startEnd = event.allDay
    ? {
        start: { date: toIsoDateOnly(event.startsAt) },
        end: { date: addOneDayIso(toIsoDateOnly(event.endsAt)) },
      }
    : {
        start: {
          dateTime: event.startsAt.toISOString(),
          timeZone,
        },
        end: {
          dateTime: event.endsAt.toISOString(),
          timeZone,
        },
      };

  return {
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    ...startEnd,
    recurrence: buildGoogleRecurrence(event),
    extendedProperties: {
      private: {
        aicEventId: event.id,
        aicType: event.type,
      },
    },
  };
}

export function computeAicContentHash(event: CalendarEvent): string {
  const payload = JSON.stringify({
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    allDay: event.allDay,
    type: event.type,
    recurrenceFrequency: event.recurrenceFrequency,
    recurrenceInterval: event.recurrenceInterval,
    recurrenceUntil: event.recurrenceUntil,
  });
  return sha256Hex(payload);
}

function parseRrule(recurrence: string[] | null | undefined): {
  frequency: CalendarRecurrenceFrequency;
  interval: number;
  until: string | null;
  warnings: string[];
} {
  const warnings: string[] = [];
  if (!recurrence?.length) {
    return {
      frequency: CalendarRecurrenceFrequency.NONE,
      interval: 1,
      until: null,
      warnings,
    };
  }

  const rruleLine = recurrence.find((line) =>
    line.toUpperCase().startsWith('RRULE:'),
  );
  if (!rruleLine) {
    warnings.push('UNSUPPORTED_RRULE_PARTS');
    return {
      frequency: CalendarRecurrenceFrequency.NONE,
      interval: 1,
      until: null,
      warnings,
    };
  }

  const body = rruleLine.slice('RRULE:'.length);
  const parts = Object.fromEntries(
    body.split(';').map((part) => {
      const [key, value = ''] = part.split('=');
      return [key.toUpperCase(), value.toUpperCase()];
    }),
  );

  const supportedKeys = new Set(['FREQ', 'INTERVAL', 'UNTIL']);
  const unknownKeys = Object.keys(parts).filter(
    (key) => !supportedKeys.has(key),
  );
  if (unknownKeys.length > 0) {
    warnings.push('UNSUPPORTED_RRULE_PARTS');
  }

  const freq = GOOGLE_TO_FREQ[parts.FREQ ?? ''];
  if (!freq) {
    warnings.push('UNSUPPORTED_RRULE_PARTS');
    return {
      frequency: CalendarRecurrenceFrequency.NONE,
      interval: 1,
      until: null,
      warnings,
    };
  }

  let until: string | null = null;
  if (parts.UNTIL) {
    const raw = parts.UNTIL;
    if (/^\d{8}/.test(raw)) {
      until = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    }
  }

  return {
    frequency: freq,
    interval: Math.max(1, Number.parseInt(parts.INTERVAL ?? '1', 10) || 1),
    until,
    warnings,
  };
}

function parseGoogleDateTime(
  value: calendar_v3.Schema$EventDateTime | undefined,
  fallback: Date,
): { date: Date; allDay: boolean } {
  if (!value) {
    return { date: fallback, allDay: false };
  }
  if (value.date) {
    return {
      date: new Date(`${value.date}T00:00:00.000Z`),
      allDay: true,
    };
  }
  if (value.dateTime) {
    return { date: new Date(value.dateTime), allDay: false };
  }
  return { date: fallback, allDay: false };
}

export function mapGoogleEventToAicFields(
  googleEvent: calendar_v3.Schema$Event,
): GooglePullMapResult {
  const warnings: string[] = [];
  const now = new Date();
  const start = parseGoogleDateTime(googleEvent.start, now);
  let end = parseGoogleDateTime(googleEvent.end, start.date);

  if (start.allDay && googleEvent.end?.date) {
    // Google all-day end is exclusive.
    const exclusiveEnd = new Date(`${googleEvent.end.date}T00:00:00.000Z`);
    exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() - 1);
    end = { date: exclusiveEnd, allDay: true };
  }

  const recurrence = parseRrule(googleEvent.recurrence);
  warnings.push(...recurrence.warnings);

  const privateProps = googleEvent.extendedProperties?.private ?? {};
  const aicTypeRaw = privateProps.aicType;
  const type =
    aicTypeRaw &&
    Object.values(CalendarEventType).includes(aicTypeRaw as CalendarEventType)
      ? (aicTypeRaw as CalendarEventType)
      : CalendarEventType.OTHER;

  return {
    fields: {
      title: (googleEvent.summary ?? 'Untitled').slice(0, 150),
      description: googleEvent.description ?? null,
      location: googleEvent.location
        ? googleEvent.location.slice(0, 150)
        : null,
      startsAt: start.date,
      endsAt: end.date.getTime() < start.date.getTime() ? start.date : end.date,
      allDay: start.allDay,
      type,
      recurrenceFrequency: recurrence.frequency,
      recurrenceInterval: recurrence.interval,
      recurrenceUntil: recurrence.until,
    },
    warnings,
  };
}

export function extractAicEventIdFromGoogle(
  googleEvent: calendar_v3.Schema$Event,
): string | null {
  const value = googleEvent.extendedProperties?.private?.aicEventId;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function parseGoogleUpdatedAt(
  googleEvent: calendar_v3.Schema$Event,
): Date | null {
  if (!googleEvent.updated) {
    return null;
  }
  const date = new Date(googleEvent.updated);
  return Number.isNaN(date.getTime()) ? null : date;
}
