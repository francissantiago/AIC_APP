import { AppLanguage } from '@enums/app-language';

export type DateDisplayPreset =
  | 'date'
  | 'datetime'
  | 'datetimeShort'
  | 'monthYear'
  | 'monthDay'
  | 'time';

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
  return text.replace(ISO_DATE_IN_TEXT, (isoDate) =>
    formatDateForLocale(isoDate, locale, 'date'),
  );
}
