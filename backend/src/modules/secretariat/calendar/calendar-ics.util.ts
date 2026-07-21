import {
  CalendarEventType,
  CalendarRecurrenceFrequency,
} from '../enums/secretariat.enums';

export const ICS_IMPORT_MAX_VEVENTS = 100;
export const ICS_EXPORT_MAX_SERIES = 500;
export const ICS_IMPORT_MAX_BYTES = 1_048_576;

const FOLD_OCTETS = 75;
const SUPPORTED_RRULE_KEYS = new Set(['FREQ', 'INTERVAL', 'UNTIL']);
const UNSUPPORTED_RRULE_KEYS = new Set([
  'BYDAY',
  'BYMONTH',
  'BYMONTHDAY',
  'BYYEARDAY',
  'BYWEEKNO',
  'BYHOUR',
  'BYMINUTE',
  'BYSECOND',
  'BYSETPOS',
  'COUNT',
  'WKST',
  'RDATE',
  'EXDATE',
]);

const FREQ_TO_RRULE: Record<string, string> = {
  [CalendarRecurrenceFrequency.DAILY]: 'DAILY',
  [CalendarRecurrenceFrequency.WEEKLY]: 'WEEKLY',
  [CalendarRecurrenceFrequency.MONTHLY]: 'MONTHLY',
  [CalendarRecurrenceFrequency.YEARLY]: 'YEARLY',
};

const RRULE_TO_FREQ: Record<string, CalendarRecurrenceFrequency> = {
  DAILY: CalendarRecurrenceFrequency.DAILY,
  WEEKLY: CalendarRecurrenceFrequency.WEEKLY,
  MONTHLY: CalendarRecurrenceFrequency.MONTHLY,
  YEARLY: CalendarRecurrenceFrequency.YEARLY,
};

const EVENT_TYPES = new Set(Object.values(CalendarEventType));

export type IcsExportEvent = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  location?: string | null;
  description?: string | null;
  type?: string;
  recurrenceFrequency?: CalendarRecurrenceFrequency | string;
  recurrenceInterval?: number;
  recurrenceUntil?: string | null;
};

export type ParsedVEvent = {
  uid: string | null;
  summary: string | null;
  description: string | null;
  location: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  allDay: boolean;
  categories: string[];
  rrule: string | null;
};

export type IcsSkipReason =
  | 'MISSING_SUMMARY'
  | 'MISSING_DTSTART'
  | 'INVALID_DTSTART'
  | 'UNSUPPORTED_FREQ'
  | 'UNSUPPORTED_RRULE'
  | 'VALIDATION_FAILED'
  | 'LIMIT_EXCEEDED'
  | 'CREATE_FAILED';

export type IcsImportSkip = {
  uid?: string | null;
  summary?: string | null;
  reason: string;
  detail?: string;
};

export type MappedIcsImport = {
  dto?: {
    title: string;
    type: CalendarEventType;
    startsAt: string;
    endsAt: string;
    allDay: boolean;
    location?: string | null;
    description?: string | null;
    recurrenceFrequency: CalendarRecurrenceFrequency;
    recurrenceInterval: number;
    recurrenceUntil?: string | null;
  };
  skip?: IcsImportSkip;
  warning?: IcsImportSkip;
};

/** Domínio do UID ICS derivado do nome da congregação (ex.: "Igreja Central" → "igreja-central"). */
export function sanitizeIcsUidDomain(congregationName: string): string {
  const normalized = congregationName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
  return normalized || 'congregation';
}

/** PRODID RFC 5545 com o nome da congregação que originou o calendário. */
export function buildIcsProdId(congregationName: string): string {
  const safe =
    congregationName
      .replace(/[\r\n\\;/]/g, ' ')
      .replace(/\/+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100) || 'Congregation';
  return `-//${safe}//Secretariat Calendar//EN`;
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function unescapeIcsText(value: string): string {
  let result = '';
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch === '\\' && i + 1 < value.length) {
      const next = value[i + 1];
      if (next === 'n' || next === 'N') {
        result += '\n';
      } else if (next === ',' || next === ';' || next === '\\') {
        result += next;
      } else {
        result += next;
      }
      i += 1;
    } else {
      result += ch;
    }
  }
  return result;
}

export function foldIcsLine(line: string): string {
  if (Buffer.byteLength(line, 'utf8') <= FOLD_OCTETS) {
    return line;
  }
  const parts: string[] = [];
  let remaining = line;
  let first = true;
  while (
    Buffer.byteLength(remaining, 'utf8') >
    (first ? FOLD_OCTETS : FOLD_OCTETS - 1)
  ) {
    const limit = first ? FOLD_OCTETS : FOLD_OCTETS - 1;
    let cut = 0;
    let bytes = 0;
    for (const ch of remaining) {
      const size = Buffer.byteLength(ch, 'utf8');
      if (bytes + size > limit) break;
      bytes += size;
      cut += ch.length;
    }
    if (cut === 0) cut = 1;
    parts.push((first ? '' : ' ') + remaining.slice(0, cut));
    remaining = remaining.slice(cut);
    first = false;
  }
  if (remaining.length > 0) {
    parts.push((first ? '' : ' ') + remaining);
  }
  return parts.join('\r\n');
}

export function unfoldIcs(raw: string): string {
  return raw.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatIcsDate(date: Date): string {
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}`;
}

export function formatIcsDateTimeUtc(date: Date): string {
  return `${formatIcsDate(date)}T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`;
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toIsoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function buildRrule(event: IcsExportEvent): string | null {
  const frequency = String(
    event.recurrenceFrequency ?? CalendarRecurrenceFrequency.NONE,
  );
  if (frequency === 'none') {
    return null;
  }
  const freq = FREQ_TO_RRULE[frequency];
  if (!freq) return null;
  const interval = Math.max(1, Math.min(30, event.recurrenceInterval ?? 1));
  const parts = [`FREQ=${freq}`, `INTERVAL=${interval}`];
  if (event.recurrenceUntil) {
    const untilDate = new Date(`${event.recurrenceUntil}T00:00:00.000Z`);
    if (!Number.isNaN(untilDate.getTime())) {
      parts.push(
        event.allDay
          ? `UNTIL=${formatIcsDate(untilDate)}`
          : `UNTIL=${formatIcsDateTimeUtc(untilDate)}`,
      );
    }
  }
  return `RRULE:${parts.join(';')}`;
}

function buildVEvent(
  event: IcsExportEvent,
  dtstamp: Date,
  uidDomain: string,
): string[] {
  const lines: string[] = ['BEGIN:VEVENT'];
  lines.push(`UID:${event.id}@${uidDomain}`);
  lines.push(`DTSTAMP:${formatIcsDateTimeUtc(dtstamp)}`);
  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(event.startsAt)}`);
    // RFC 5545: DTEND for all-day is exclusive
    const exclusiveEnd =
      event.endsAt.getTime() > event.startsAt.getTime()
        ? event.endsAt
        : addUtcDays(event.startsAt, 1);
    lines.push(`DTEND;VALUE=DATE:${formatIcsDate(exclusiveEnd)}`);
  } else {
    lines.push(`DTSTART:${formatIcsDateTimeUtc(event.startsAt)}`);
    lines.push(`DTEND:${formatIcsDateTimeUtc(event.endsAt)}`);
  }
  lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  if (event.type) {
    lines.push(`CATEGORIES:${escapeIcsText(event.type)}`);
  }
  const rrule = buildRrule(event);
  if (rrule) lines.push(rrule);
  lines.push('END:VEVENT');
  return lines;
}

export function buildIcsCalendar(
  events: IcsExportEvent[],
  options: { congregationName: string; dtstamp?: Date },
): string {
  const dtstamp = options.dtstamp ?? new Date();
  const uidDomain = sanitizeIcsUidDomain(options.congregationName);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${buildIcsProdId(options.congregationName)}`,
    'CALSCALE:GREGORIAN',
  ];
  for (const event of events) {
    lines.push(...buildVEvent(event, dtstamp, uidDomain));
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

function parseDateValue(
  value: string,
  params: Record<string, string>,
): { date: Date; allDay: boolean } | null {
  const isDate = params.VALUE === 'DATE' || /^\d{8}$/.test(value);
  if (isDate) {
    const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
    if (!match) return null;
    const date = new Date(
      Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
    );
    if (Number.isNaN(date.getTime())) return null;
    return { date, allDay: true };
  }

  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(value);
  if (!match) return null;
  const date = new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6]),
    ),
  );
  if (Number.isNaN(date.getTime())) return null;
  return { date, allDay: false };
}

function splitProperty(line: string): {
  name: string;
  params: Record<string, string>;
  value: string;
} | null {
  const colon = line.indexOf(':');
  if (colon < 0) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const segments = left.split(';');
  const name = segments[0]?.toUpperCase() ?? '';
  if (!name) return null;
  const params: Record<string, string> = {};
  for (const segment of segments.slice(1)) {
    const eq = segment.indexOf('=');
    if (eq < 0) continue;
    params[segment.slice(0, eq).toUpperCase()] = segment.slice(eq + 1);
  }
  return { name, params, value };
}

function parseVEventBlock(block: string): ParsedVEvent {
  const props: Record<
    string,
    { params: Record<string, string>; value: string }
  > = {};
  const categories: string[] = [];
  for (const rawLine of block.split(/\r\n|\n|\r/)) {
    const line = rawLine.trimEnd();
    if (!line || line === 'BEGIN:VEVENT' || line === 'END:VEVENT') continue;
    const parsed = splitProperty(line);
    if (!parsed) continue;
    if (parsed.name === 'CATEGORIES') {
      categories.push(
        ...unescapeIcsText(parsed.value)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      );
      continue;
    }
    props[parsed.name] = { params: parsed.params, value: parsed.value };
  }

  const dtstart = props.DTSTART
    ? parseDateValue(props.DTSTART.value, props.DTSTART.params)
    : null;
  const dtend = props.DTEND
    ? parseDateValue(props.DTEND.value, props.DTEND.params)
    : null;

  return {
    uid: props.UID ? unescapeIcsText(props.UID.value) : null,
    summary: props.SUMMARY ? unescapeIcsText(props.SUMMARY.value) : null,
    description: props.DESCRIPTION
      ? unescapeIcsText(props.DESCRIPTION.value)
      : null,
    location: props.LOCATION ? unescapeIcsText(props.LOCATION.value) : null,
    startsAt: dtstart?.date ?? null,
    endsAt: dtend?.date ?? null,
    allDay: dtstart?.allDay ?? false,
    categories,
    rrule: props.RRULE?.value ?? null,
  };
}

export function parseIcsCalendar(raw: string): ParsedVEvent[] {
  const unfolded = unfoldIcs(raw.replace(/^\uFEFF/, ''));
  const events: ParsedVEvent[] = [];
  const regex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(unfolded)) !== null) {
    events.push(parseVEventBlock(`BEGIN:VEVENT${match[1]}END:VEVENT`));
  }
  return events;
}

function resolveEventType(categories: string[]): CalendarEventType {
  for (const category of categories) {
    const normalized = category.trim().toLowerCase();
    if (EVENT_TYPES.has(normalized as CalendarEventType)) {
      return normalized as CalendarEventType;
    }
  }
  return CalendarEventType.OTHER;
}

function parseRrule(rrule: string): {
  frequency?: CalendarRecurrenceFrequency;
  interval: number;
  until?: string | null;
  unsupported: boolean;
  unknownFreq: boolean;
} {
  const parts = rrule.split(';').filter(Boolean);
  let frequency: CalendarRecurrenceFrequency | undefined;
  let interval = 1;
  let until: string | null = null;
  let unsupported = false;
  let unknownFreq = false;

  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const key = part.slice(0, eq).toUpperCase();
    const value = part.slice(eq + 1);
    if (UNSUPPORTED_RRULE_KEYS.has(key) || !SUPPORTED_RRULE_KEYS.has(key)) {
      if (key !== 'FREQ' && key !== 'INTERVAL' && key !== 'UNTIL') {
        unsupported = true;
      }
    }
    if (key === 'FREQ') {
      const mapped = RRULE_TO_FREQ[value.toUpperCase()];
      if (!mapped) {
        unknownFreq = true;
      } else {
        frequency = mapped;
      }
    } else if (key === 'INTERVAL') {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed >= 1) {
        interval = Math.min(30, Math.floor(parsed));
      }
    } else if (key === 'UNTIL') {
      const parsed = parseDateValue(value, {
        VALUE: /^\d{8}$/.test(value) ? 'DATE' : 'DATE-TIME',
      });
      if (parsed) {
        until = toIsoDate(parsed.date);
      }
    }
  }

  return { frequency, interval, until, unsupported, unknownFreq };
}

export function mapParsedVEventToCreateInput(
  event: ParsedVEvent,
): MappedIcsImport {
  const summary = event.summary?.trim() ?? '';
  if (!summary) {
    return {
      skip: {
        uid: event.uid,
        summary: event.summary,
        reason: 'MISSING_SUMMARY',
      },
    };
  }
  if (!event.startsAt) {
    return {
      skip: {
        uid: event.uid,
        summary,
        reason: 'MISSING_DTSTART',
      },
    };
  }
  if (Number.isNaN(event.startsAt.getTime())) {
    return {
      skip: {
        uid: event.uid,
        summary,
        reason: 'INVALID_DTSTART',
      },
    };
  }

  const allDay = event.allDay;
  let endsAt = event.endsAt;
  if (!endsAt) {
    endsAt = allDay
      ? addUtcDays(event.startsAt, 1)
      : new Date(event.startsAt.getTime() + 60 * 60 * 1000);
  } else if (allDay) {
    // DTEND DATE is exclusive — convert to inclusive end used by domain
    // Domain stores endsAt as datetime; for all-day create we keep exclusive DATE
    // semantics aligned with existing create (starts/ends as provided).
    // Prefer endsAt as the exclusive DATE moment (midnight of next day).
  }

  let recurrenceFrequency = CalendarRecurrenceFrequency.NONE;
  let recurrenceInterval = 1;
  let recurrenceUntil: string | null = null;
  let warning: IcsImportSkip | undefined;

  if (event.rrule) {
    const parsed = parseRrule(event.rrule);
    if (parsed.unknownFreq) {
      return {
        skip: {
          uid: event.uid,
          summary,
          reason: 'UNSUPPORTED_FREQ',
          detail: event.rrule,
        },
      };
    }
    if (parsed.unsupported) {
      warning = {
        uid: event.uid,
        summary,
        reason: 'UNSUPPORTED_RRULE_PARTS',
        detail: event.rrule,
      };
      recurrenceFrequency = CalendarRecurrenceFrequency.NONE;
      recurrenceInterval = 1;
      recurrenceUntil = null;
    } else if (parsed.frequency) {
      recurrenceFrequency = parsed.frequency;
      recurrenceInterval = parsed.interval;
      recurrenceUntil = parsed.until ?? null;
    }
  }

  return {
    dto: {
      title: summary.slice(0, 150),
      type: resolveEventType(event.categories),
      startsAt: event.startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      allDay,
      location: event.location ? event.location.slice(0, 150) : null,
      description: event.description ? event.description.slice(0, 65535) : null,
      recurrenceFrequency,
      recurrenceInterval,
      recurrenceUntil,
    },
    warning,
  };
}
