import {
  calendarDisplayColor,
  isCrossMidnightSameDayEnd,
  isEventRangeInvalid,
  isMonthBannerEvent,
  normalizeEventRange,
  previewMonthViewEvents,
  remainingMonthViewEventsCount,
  sortMonthViewEvents,
  spansMidnight,
  formatEventPreviewWhen,
  groupEventsForAgendaPrint,
  weekHeaderDayNumber,
  weekHeaderWeekday,
} from './agenda-calendar.util';

describe('agenda-calendar.util', () => {
  it('detects cross-midnight intent on the same calendar day', () => {
    expect(isCrossMidnightSameDayEnd('2026-07-19T22:00', '2026-07-19T02:00')).toBe(true);
    expect(isCrossMidnightSameDayEnd('2026-07-19T03:00', '2026-07-19T05:00')).toBe(false);
  });

  it('normalizes vigil end to the next day', () => {
    const { startsAt, endsAt } = normalizeEventRange('2026-07-19T22:00', '2026-07-19T02:00');
    expect(startsAt.getHours()).toBe(22);
    expect(endsAt.getDate()).toBe(20);
    expect(endsAt.getHours()).toBe(2);
  });

  it('keeps same-day morning events unchanged', () => {
    const { startsAt, endsAt } = normalizeEventRange('2026-07-19T03:00', '2026-07-19T05:00');
    expect(startsAt.getHours()).toBe(3);
    expect(endsAt.getHours()).toBe(5);
    expect(startsAt.toDateString()).toBe(endsAt.toDateString());
  });

  it('does not treat cross-midnight vigils as invalid', () => {
    expect(isEventRangeInvalid('2026-07-19T22:00', '2026-07-19T02:00')).toBe(false);
  });

  it('rejects zero-duration ranges after normalization', () => {
    expect(isEventRangeInvalid('2026-07-19T22:00', '2026-07-19T22:00')).toBe(true);
  });

  it('detects events spanning midnight after normalization', () => {
    const { startsAt, endsAt } = normalizeEventRange('2026-07-19T22:00', '2026-07-19T02:00');
    expect(spansMidnight(startsAt, endsAt)).toBe(true);
  });

  it('sorts month view events with banners first and then by time', () => {
    const sorted = sortMonthViewEvents([
      { allDay: false, start: '2026-07-19T19:00:00', meta: null },
      { allDay: true, start: '2026-07-19T00:00:00', meta: null },
      { allDay: false, start: '2026-07-19T08:00:00', meta: null },
    ]);

    expect(isMonthBannerEvent(sorted[0]!)).toBe(true);
    expect(new Date(sorted[1]!.start).getHours()).toBe(8);
    expect(new Date(sorted[2]!.start).getHours()).toBe(19);
  });

  it('limits month preview to three events and counts the remainder', () => {
    const events = [
      { allDay: false, start: '2026-07-19T08:00:00', meta: null },
      { allDay: false, start: '2026-07-19T10:00:00', meta: null },
      { allDay: false, start: '2026-07-19T12:00:00', meta: null },
      { allDay: false, start: '2026-07-19T14:00:00', meta: null },
    ];

    expect(previewMonthViewEvents(events, 3)).toHaveLength(3);
    expect(remainingMonthViewEventsCount(events.length, 3)).toBe(1);
  });

  it('treats birthday events as month banners', () => {
    expect(
      isMonthBannerEvent({
        allDay: false,
        start: '2026-07-19T00:00:00',
        meta: { sourceMemberId: 'm1' },
      }),
    ).toBe(true);
  });

  it('uses solid banner colors for all-day display', () => {
    const palette = { primary: '#0369a1', secondary: '#e0f2fe', secondaryText: '#0c4a6e' };
    const display = calendarDisplayColor(palette, {
      allDay: true,
      start: '2026-07-19T00:00:00',
      meta: null,
    });

    expect(display.secondary).toBe(palette.primary);
    expect(display.secondaryText).toBe('#ffffff');
  });

  it('formats week header labels like Google Calendar', () => {
    const monday = new Date(2026, 6, 20);

    expect(weekHeaderWeekday(monday, 'pt-BR')).toMatch(/^SEG\.$/);
    expect(weekHeaderDayNumber(monday)).toBe('20');
  });

  it('formats preview when-line with date and time range', () => {
    const label = formatEventPreviewWhen(
      '2026-06-01T08:00:00',
      '2026-06-01T09:00:00',
      false,
      'pt-BR',
      'Dia todo',
    );

    expect(label).toContain('08:00');
    expect(label).toContain('09:00');
    expect(label).toContain('⋅');
  });

  it('groups printable events by day with all-day first', () => {
    const from = new Date(2026, 6, 19, 0, 0, 0, 0);
    const to = new Date(2026, 6, 20, 23, 59, 59, 999);
    const groups = groupEventsForAgendaPrint(
      [
        {
          title: 'Culto',
          startsAt: '2026-07-19T19:00:00',
          endsAt: '2026-07-19T21:00:00',
          allDay: false,
          typeLabel: 'Culto',
        },
        {
          title: 'Aniversário',
          startsAt: '2026-07-19T00:00:00',
          endsAt: '2026-07-19T23:59:59',
          allDay: true,
          typeLabel: 'Aniversário',
        },
      ],
      from,
      to,
      { includeEmptyDays: true },
    );

    expect(groups).toHaveLength(2);
    expect(groups[0].events.map((event) => event.title)).toEqual(['Aniversário', 'Culto']);
    expect(groups[1].events).toHaveLength(0);
  });
});
