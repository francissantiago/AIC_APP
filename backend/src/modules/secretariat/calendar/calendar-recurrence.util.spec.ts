import {
  CalendarEventType,
  CalendarRecurrenceFrequency,
} from '../enums/secretariat.enums';
import { expandCalendarEvent } from './calendar-recurrence.util';
import { CalendarEvent } from './entities/calendar-event.entity';

function buildEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    congregationId: 'cong',
    createdByUserId: 'user',
    title: 'Culto',
    type: CalendarEventType.SERVICE,
    startsAt: new Date('2026-07-05T22:00:00.000Z'),
    endsAt: new Date('2026-07-06T00:00:00.000Z'),
    allDay: false,
    location: null,
    description: null,
    recurrenceFrequency: CalendarRecurrenceFrequency.WEEKLY,
    recurrenceInterval: 1,
    recurrenceUntil: '2026-07-26',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    sourceMemberId: null,
    ...overrides,
  };
}

describe('expandCalendarEvent', () => {
  it('expande eventos semanais dentro do intervalo', () => {
    const event = buildEvent();
    const occurrences = expandCalendarEvent(
      event,
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-31T23:59:59.999Z'),
    );

    expect(occurrences).toHaveLength(4);
    expect(occurrences[0].seriesId).toBe(event.id);
    expect(occurrences[0].occurrenceId).toContain(event.id);
    expect(occurrences.map((item) => item.startsAt.toISOString())).toEqual([
      '2026-07-05T22:00:00.000Z',
      '2026-07-12T22:00:00.000Z',
      '2026-07-19T22:00:00.000Z',
      '2026-07-26T22:00:00.000Z',
    ]);
  });

  it('expande eventos anuais dentro do intervalo', () => {
    const event = buildEvent({
      startsAt: new Date('2026-07-19T00:00:00.000Z'),
      endsAt: new Date('2026-07-19T23:59:59.999Z'),
      allDay: true,
      recurrenceFrequency: CalendarRecurrenceFrequency.YEARLY,
      recurrenceUntil: null,
    });
    const occurrences = expandCalendarEvent(
      event,
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2027-12-31T23:59:59.999Z'),
    );

    expect(occurrences).toHaveLength(2);
    expect(occurrences.map((item) => item.startsAt.toISOString())).toEqual([
      '2026-07-19T00:00:00.000Z',
      '2027-07-19T00:00:00.000Z',
    ]);
  });

  it('retorna uma ocorrência para evento sem recorrência', () => {
    const event = buildEvent({
      recurrenceFrequency: CalendarRecurrenceFrequency.NONE,
      recurrenceUntil: null,
    });
    const occurrences = expandCalendarEvent(
      event,
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-31T23:59:59.999Z'),
    );

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].occurrenceId).toBe(event.id);
  });
});
