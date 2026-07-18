import { CalendarRecurrenceFrequency } from '../enums/secretariat.enums';
import { CalendarEvent } from './entities/calendar-event.entity';

const MAX_OCCURRENCES = 366;

export type ExpandedCalendarOccurrence = {
  seriesId: string;
  occurrenceId: string;
  startsAt: Date;
  endsAt: Date;
  event: CalendarEvent;
};

function toDateKey(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addInterval(
  date: Date,
  frequency: CalendarRecurrenceFrequency,
  interval: number,
): Date {
  const next = new Date(date.getTime());
  switch (frequency) {
    case CalendarRecurrenceFrequency.DAILY:
      next.setUTCDate(next.getUTCDate() + interval);
      break;
    case CalendarRecurrenceFrequency.WEEKLY:
      next.setUTCDate(next.getUTCDate() + 7 * interval);
      break;
    case CalendarRecurrenceFrequency.MONTHLY: {
      const day = next.getUTCDate();
      next.setUTCDate(1);
      next.setUTCMonth(next.getUTCMonth() + interval);
      const lastDay = new Date(
        Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
      ).getUTCDate();
      next.setUTCDate(Math.min(day, lastDay));
      break;
    }
    default:
      break;
  }
  return next;
}

function overlaps(
  start: Date,
  end: Date,
  rangeFrom: Date,
  rangeTo: Date,
): boolean {
  return (
    end.getTime() >= rangeFrom.getTime() && start.getTime() <= rangeTo.getTime()
  );
}

/**
 * Expande um evento mestre em ocorrências que intersectam [rangeFrom, rangeTo].
 * Eventos sem recorrência geram no máximo uma ocorrência (se houver overlap).
 */
export function expandCalendarEvent(
  event: CalendarEvent,
  rangeFrom: Date,
  rangeTo: Date,
): ExpandedCalendarOccurrence[] {
  const durationMs = Math.max(
    0,
    event.endsAt.getTime() - event.startsAt.getTime(),
  );
  const frequency =
    event.recurrenceFrequency ?? CalendarRecurrenceFrequency.NONE;
  const interval = Math.max(1, event.recurrenceInterval ?? 1);

  if (frequency === CalendarRecurrenceFrequency.NONE) {
    if (!overlaps(event.startsAt, event.endsAt, rangeFrom, rangeTo)) {
      return [];
    }
    return [
      {
        seriesId: event.id,
        occurrenceId: event.id,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        event,
      },
    ];
  }

  const untilKey = event.recurrenceUntil ?? null;
  const occurrences: ExpandedCalendarOccurrence[] = [];
  let cursor = new Date(event.startsAt.getTime());
  let guard = 0;

  while (cursor.getTime() <= rangeTo.getTime() && guard < MAX_OCCURRENCES) {
    guard += 1;
    const occurrenceEnd = new Date(cursor.getTime() + durationMs);
    const cursorKey = toDateKey(cursor);

    if (untilKey && cursorKey > untilKey) {
      break;
    }

    if (overlaps(cursor, occurrenceEnd, rangeFrom, rangeTo)) {
      occurrences.push({
        seriesId: event.id,
        occurrenceId: `${event.id}_${cursor.toISOString()}`,
        startsAt: new Date(cursor.getTime()),
        endsAt: occurrenceEnd,
        event,
      });
    }

    cursor = addInterval(cursor, frequency, interval);
    if (cursor.getTime() === event.startsAt.getTime()) {
      break;
    }
  }

  return occurrences;
}
