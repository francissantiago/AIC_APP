export function isCrossMidnightSameDayEnd(startsAt: string, endsAt: string): boolean {
  if (!startsAt || !endsAt) {
    return false;
  }
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (start.toDateString() !== end.toDateString()) {
    return false;
  }
  return end.getTime() < start.getTime();
}

export function normalizeEventRange(
  startsAt: string,
  endsAt: string,
): { startsAt: Date; endsAt: Date } {
  const start = new Date(startsAt);
  let end = new Date(endsAt);
  if (isCrossMidnightSameDayEnd(startsAt, endsAt)) {
    end = new Date(end);
    end.setDate(end.getDate() + 1);
  }
  return { startsAt: start, endsAt: end };
}

export function isEventRangeInvalid(startsAt: string, endsAt: string): boolean {
  if (!startsAt || !endsAt) {
    return false;
  }
  const { startsAt: start, endsAt: end } = normalizeEventRange(startsAt, endsAt);
  return end.getTime() <= start.getTime();
}

export function spansMidnight(startsAt: Date, endsAt: Date): boolean {
  return startsAt.toDateString() !== endsAt.toDateString();
}

export type MonthViewSortableEvent = {
  allDay?: boolean;
  start: Date | string | number;
  meta?: { sourceMemberId?: string | null } | null;
  sourceMemberId?: string | null;
};

export type CalendarDisplayPalette = {
  primary: string;
  secondary: string;
  secondaryText: string;
};

export function isMonthBannerEvent(event: MonthViewSortableEvent): boolean {
  return Boolean(event.allDay || event.sourceMemberId || event.meta?.sourceMemberId);
}

export function calendarDisplayColor(
  palette: CalendarDisplayPalette,
  event: MonthViewSortableEvent,
): CalendarDisplayPalette {
  if (isMonthBannerEvent(event)) {
    return {
      primary: palette.primary,
      secondary: palette.primary,
      secondaryText: '#ffffff',
    };
  }
  return palette;
}

export function sortMonthViewEvents<T extends MonthViewSortableEvent>(events: T[]): T[] {
  return [...events].sort((left, right) => {
    const leftBanner = isMonthBannerEvent(left);
    const rightBanner = isMonthBannerEvent(right);
    if (leftBanner !== rightBanner) {
      return leftBanner ? -1 : 1;
    }
    return new Date(left.start).getTime() - new Date(right.start).getTime();
  });
}

export function previewMonthViewEvents<T extends MonthViewSortableEvent>(
  events: T[],
  limit: number,
): T[] {
  return sortMonthViewEvents(events).slice(0, limit);
}

export function remainingMonthViewEventsCount(total: number, limit: number): number {
  return Math.max(0, total - limit);
}

export const AGENDA_WEEK_STARTS_ON = 0;

export function weekHeaderWeekday(date: Date, locale: string): string {
  const label = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  return `${label.replace(/\.$/, '').toUpperCase()}.`;
}

export function weekHeaderDayNumber(date: Date): string {
  return String(date.getDate());
}

/** Google Calendar–style when line: "Monday, June 1 ⋅ 08:00 – 09:00" */
export function formatEventPreviewWhen(
  startsAt: Date | string,
  endsAt: Date | string,
  allDay: boolean,
  locale: string,
  allDayLabel: string,
): string {
  const start = startsAt instanceof Date ? startsAt : new Date(startsAt);
  const end = endsAt instanceof Date ? endsAt : new Date(endsAt);
  const datePart = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(start);

  if (allDay) {
    return `${datePart} ⋅ ${allDayLabel}`;
  }

  const pad = (value: number) => String(value).padStart(2, '0');
  const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
  const endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
  return `${datePart} ⋅ ${startTime} – ${endTime}`;
}

export type AgendaPrintableEvent = {
  title: string;
  startsAt: Date | string;
  endsAt: Date | string;
  allDay: boolean;
  location?: string | null;
  typeLabel: string;
};

export type AgendaPrintDayGroup = {
  dateKey: string;
  date: Date;
  events: AgendaPrintableEvent[];
};

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatPrintTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function eachLocalDayInRange(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= end.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/** Groups events by local start day; sorts all-day first, then by start time. */
export function groupEventsForAgendaPrint(
  events: AgendaPrintableEvent[],
  from: Date,
  to: Date,
  options?: { includeEmptyDays?: boolean },
): AgendaPrintDayGroup[] {
  const includeEmptyDays = options?.includeEmptyDays ?? false;
  const byDay = new Map<string, AgendaPrintableEvent[]>();

  for (const event of events) {
    const start = event.startsAt instanceof Date ? event.startsAt : new Date(event.startsAt);
    if (start.getTime() < from.getTime() || start.getTime() > to.getTime()) {
      continue;
    }
    const key = localDateKey(start);
    const list = byDay.get(key) ?? [];
    list.push(event);
    byDay.set(key, list);
  }

  const days = includeEmptyDays
    ? eachLocalDayInRange(from, to)
    : [...byDay.keys()]
        .sort()
        .map((key) => {
          const [year, month, day] = key.split('-').map(Number);
          return new Date(year, month - 1, day);
        });

  return days.map((date) => {
    const key = localDateKey(date);
    const dayEvents = [...(byDay.get(key) ?? [])].sort((left, right) => {
      if (left.allDay !== right.allDay) {
        return left.allDay ? -1 : 1;
      }
      return (
        new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
      );
    });
    return { dateKey: key, date, events: dayEvents };
  });
}

export function buildAgendaPrintHtml(params: {
  title: string;
  periodLabel: string;
  viewLabel: string;
  emptyDayLabel: string;
  emptyPeriodLabel: string;
  allDayLabel: string;
  groups: AgendaPrintDayGroup[];
  locale: string;
  escapeHtml: (value: string) => string;
}): string {
  const { escapeHtml, allDayLabel, emptyDayLabel, emptyPeriodLabel, locale } = params;
  const dayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const sections =
    params.groups.length === 0 || params.groups.every((group) => group.events.length === 0)
      ? `<p class="empty">${escapeHtml(emptyPeriodLabel)}</p>`
      : params.groups
          .map((group) => {
            const heading = escapeHtml(dayFormatter.format(group.date));
            if (group.events.length === 0) {
              return `<section><h2>${heading}</h2><p class="empty">${escapeHtml(emptyDayLabel)}</p></section>`;
            }
            const items = group.events
              .map((event) => {
                const start = event.startsAt instanceof Date ? event.startsAt : new Date(event.startsAt);
                const end = event.endsAt instanceof Date ? event.endsAt : new Date(event.endsAt);
                const time = event.allDay
                  ? escapeHtml(allDayLabel)
                  : `${escapeHtml(formatPrintTime(start))} – ${escapeHtml(formatPrintTime(end))}`;
                const location = event.location
                  ? `<div class="meta">${escapeHtml(event.location)}</div>`
                  : '';
                return `<li>
                  <div class="time">${time}</div>
                  <div class="details">
                    <div class="name">${escapeHtml(event.title)}</div>
                    <div class="meta">${escapeHtml(event.typeLabel)}</div>
                    ${location}
                  </div>
                </li>`;
              })
              .join('');
            return `<section><h2>${heading}</h2><ul>${items}</ul></section>`;
          })
          .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(params.title)} — ${escapeHtml(params.periodLabel)}</title>
<style>
  @page { margin: 16mm; }
  body { font-family: system-ui, sans-serif; color: #111; margin: 0; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .period { color: #444; margin: 0 0 4px; font-size: 14px; }
  .view { color: #666; margin: 0 0 20px; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
  section { break-inside: avoid; margin: 0 0 18px; }
  h2 { font-size: 14px; margin: 0 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; text-transform: capitalize; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: flex; gap: 12px; padding: 6px 0; border-bottom: 1px solid #eee; }
  .time { flex: 0 0 7.5rem; font-size: 12px; color: #333; font-variant-numeric: tabular-nums; }
  .details { flex: 1; min-width: 0; }
  .name { font-size: 13px; font-weight: 600; }
  .meta { font-size: 12px; color: #555; margin-top: 2px; }
  .empty { color: #777; font-size: 13px; margin: 0; }
</style></head><body>
<h1>${escapeHtml(params.title)}</h1>
<p class="period">${escapeHtml(params.periodLabel)}</p>
<p class="view">${escapeHtml(params.viewLabel)}</p>
${sections}
</body></html>`;
}
