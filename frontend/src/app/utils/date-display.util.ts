import { AppLanguage } from '@enums/app-language';

export type DateDisplayPreset =
  'date' | 'datetime' | 'datetimeShort' | 'monthYear' | 'monthDay' | 'time';

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;
export const ISO_DATE_IN_TEXT = /(?<!\d)\d{4}-\d{2}-\d{2}(?!\d)/g;
const TIME_WITH_SECONDS = /^(\d{2}):(\d{2})(?::\d{2})?$/;

export function parseIsoDateOnly(value: string): Date | null {
  if (!ISO_DATE_ONLY.test(value)) {
    return null;
  }
  const [yearPart, monthPart, dayPart] = value.split('-');
  return new Date(Number(yearPart), Number(monthPart) - 1, Number(dayPart), 12, 0, 0, 0);
}

export function parseDisplayDate(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (ISO_DATE_ONLY.test(value)) {
    return parseIsoDateOnly(value);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatMonthYearForLocale(isoMonth: string, locale: string): string {
  if (!ISO_MONTH.test(isoMonth)) {
    return isoMonth;
  }
  const [yearPart, monthPart] = isoMonth.split('-');
  const date = new Date(Number(yearPart), Number(monthPart) - 1, 1, 12, 0, 0, 0);
  const formatted = new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
  }).format(date);
  if (locale === AppLanguage.PortugueseBrazil) {
    return formatted.replace('.', '');
  }
  return formatted;
}

export function formatTimeForLocale(value: string, locale: string): string {
  const match = TIME_WITH_SECONDS.exec(value.trim());
  if (!match) {
    return value;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const date = new Date(2000, 0, 1, hours, minutes, 0, 0);
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateForLocale(
  value: string | Date | null | undefined,
  locale: string,
  preset: DateDisplayPreset = 'date',
): string {
  if (value == null || value === '') {
    return '';
  }

  if (preset === 'monthYear' && typeof value === 'string' && ISO_MONTH.test(value)) {
    return formatMonthYearForLocale(value, locale);
  }

  if (preset === 'time' && typeof value === 'string') {
    return formatTimeForLocale(value, locale);
  }

  const date = value instanceof Date ? value : parseDisplayDate(value);
  if (!date) {
    return typeof value === 'string' ? value : '';
  }

  switch (preset) {
    case 'date':
      return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
    case 'datetime':
      return new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    case 'datetimeShort':
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date);
    case 'monthDay':
      return new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
      }).format(date);
    case 'monthYear':
      return new Intl.DateTimeFormat(locale, {
        month: 'short',
        year: 'numeric',
      }).format(date);
    case 'time':
      return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

export function formatIsoDatesInTextForLocale(text: string, locale: string): string {
  if (!text) {
    return text;
  }
  return text.replace(ISO_DATE_IN_TEXT, (isoDate) => formatDateForLocale(isoDate, locale, 'date'));
}

const ISO_DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const COMPACT_DATE = /^\d{8}$/;

function padTwo(value: number): string {
  return String(value).padStart(2, '0');
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function buildIsoDateOnly(year: number, month: number, day: number): string | null {
  if (!isValidCalendarDate(year, month, day)) {
    return null;
  }
  return `${padTwo(year)}-${padTwo(month)}-${padTwo(day)}`;
}

function parseNumericParts(parts: string[]): { year: number; month: number; day: number } | null {
  if (parts.length !== 3) {
    return null;
  }
  const numbers = parts.map((part) => Number(part));
  if (numbers.some((value) => Number.isNaN(value))) {
    return null;
  }
  const [first, second, third] = numbers;
  if (first >= 1000) {
    return { year: first, month: second, day: third };
  }
  if (third >= 1000) {
    return { year: third, month: second, day: first };
  }
  return null;
}

function parseDatePartsForLocale(
  parts: string[],
  locale: string,
): { year: number; month: number; day: number } | null {
  const numbers = parts.map((part) => Number(part));
  if (numbers.some((value) => Number.isNaN(value))) {
    return null;
  }

  if (parts[0].length === 4) {
    return { year: numbers[0], month: numbers[1], day: numbers[2] };
  }

  if (parts[2].length === 4) {
    if (locale === AppLanguage.English) {
      return { year: numbers[2], month: numbers[0], day: numbers[1] };
    }
    return { year: numbers[2], month: numbers[1], day: numbers[0] };
  }

  return parseNumericParts(parts);
}

export function toIsoDateOnly(date: Date): string {
  return buildIsoDateOnly(date.getFullYear(), date.getMonth() + 1, date.getDate()) ?? '';
}

export function isIsoDateInRange(iso: string, min?: string | null, max?: string | null): boolean {
  if (min && iso < min) {
    return false;
  }
  if (max && iso > max) {
    return false;
  }
  return true;
}

export function parseFlexibleDateInput(text: string, locale: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  if (ISO_DATE_ONLY.test(trimmed)) {
    return trimmed;
  }

  if (COMPACT_DATE.test(trimmed)) {
    const day = Number(trimmed.slice(0, 2));
    const month = Number(trimmed.slice(2, 4));
    const year = Number(trimmed.slice(4, 8));
    const iso = buildIsoDateOnly(year, month, day);
    if (iso) {
      return iso;
    }
  }

  for (const separator of ['/', '-', '.']) {
    if (!trimmed.includes(separator)) {
      continue;
    }
    const parts = trimmed.split(separator).map((part) => part.trim());
    const parsed = parseDatePartsForLocale(parts, locale);
    if (parsed) {
      const iso = buildIsoDateOnly(parsed.year, parsed.month, parsed.day);
      if (iso) {
        return iso;
      }
    }
  }

  return null;
}

export function maskTimeDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (!digits) {
    return '';
  }
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function parseFlexibleTimeInput(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const match = /^(\d{1,2}):(\d{1,2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return `${padTwo(hours)}:${padTwo(minutes)}`;
}

export function splitDatetimeLocal(value: string): { date: string; time: string } | null {
  if (!ISO_DATETIME_LOCAL.test(value)) {
    return null;
  }
  const [date, time] = value.split('T');
  return { date, time };
}

export function joinDatetimeLocal(date: string, time: string): string {
  return `${date}T${time}`;
}

export function toDatetimeLocalFromIso(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return joinDatetimeLocal(
    toIsoDateOnly(date),
    `${padTwo(date.getHours())}:${padTwo(date.getMinutes())}`,
  );
}

export function parseFlexibleDatetimeInput(text: string, locale: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  if (ISO_DATETIME_LOCAL.test(trimmed)) {
    return trimmed;
  }

  const isoInstant = Date.parse(trimmed);
  if (!Number.isNaN(isoInstant)) {
    return toDatetimeLocalFromIso(new Date(isoInstant).toISOString());
  }

  const spaceMatch = /^(.+?)[ T](\d{1,2}:\d{2}(?::\d{2})?)$/.exec(trimmed);
  if (spaceMatch) {
    const dateIso = parseFlexibleDateInput(spaceMatch[1], locale);
    const time = parseFlexibleTimeInput(spaceMatch[2]);
    if (dateIso && time) {
      return joinDatetimeLocal(dateIso, time);
    }
  }

  const dateOnly = parseFlexibleDateInput(trimmed, locale);
  if (dateOnly) {
    return joinDatetimeLocal(dateOnly, '00:00');
  }

  return null;
}

export function getWeekStartsOn(locale: string): 0 | 1 {
  return locale === AppLanguage.English ? 0 : 1;
}
