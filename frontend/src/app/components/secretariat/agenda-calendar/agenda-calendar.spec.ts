import {
  isCrossMidnightSameDayEnd,
  isEventRangeInvalid,
  normalizeEventRange,
  spansMidnight,
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
});
