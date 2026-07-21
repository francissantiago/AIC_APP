import {
  CalendarEventType,
  CalendarRecurrenceFrequency,
} from '../enums/secretariat.enums';
import { CalendarEvent } from './entities/calendar-event.entity';
import {
  buildGoogleRecurrence,
  mapAicEventToGoogleResource,
  mapGoogleEventToAicFields,
} from './google-calendar-mapper.util';

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'event-1',
    congregationId: 'cong-1',
    createdByUserId: 'user-1',
    sourceMemberId: null,
    title: 'Culto',
    type: CalendarEventType.SERVICE,
    startsAt: new Date('2026-07-20T19:00:00.000Z'),
    endsAt: new Date('2026-07-20T21:00:00.000Z'),
    allDay: false,
    location: 'Templo',
    description: 'Descrição',
    recurrenceFrequency: CalendarRecurrenceFrequency.NONE,
    recurrenceInterval: 1,
    recurrenceUntil: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('google-calendar-mapper.util', () => {
  it('maps timed AIC event to Google resource', () => {
    const resource = mapAicEventToGoogleResource(
      makeEvent(),
      'America/Sao_Paulo',
    );
    expect(resource.summary).toBe('Culto');
    expect(resource.start?.dateTime).toBe('2026-07-20T19:00:00.000Z');
    expect(resource.end?.dateTime).toBe('2026-07-20T21:00:00.000Z');
    expect(resource.extendedProperties?.private?.aicEventId).toBe('event-1');
    expect(resource.extendedProperties?.private?.aicType).toBe('service');
  });

  it('maps all-day AIC event with exclusive end date', () => {
    const resource = mapAicEventToGoogleResource(
      makeEvent({
        allDay: true,
        startsAt: new Date('2026-07-20T00:00:00.000Z'),
        endsAt: new Date('2026-07-20T00:00:00.000Z'),
      }),
      'America/Sao_Paulo',
    );
    expect(resource.start?.date).toBe('2026-07-20');
    expect(resource.end?.date).toBe('2026-07-21');
  });

  it('builds simple RRULE for weekly recurrence', () => {
    expect(
      buildGoogleRecurrence(
        makeEvent({
          recurrenceFrequency: CalendarRecurrenceFrequency.WEEKLY,
          recurrenceInterval: 2,
          recurrenceUntil: '2026-12-31',
        }),
      ),
    ).toEqual(['RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20261231T235959Z']);
  });

  it('maps Google all-day event back to AIC fields', () => {
    const mapped = mapGoogleEventToAicFields({
      summary: 'Aniversário',
      start: { date: '2026-08-01' },
      end: { date: '2026-08-02' },
      extendedProperties: { private: { aicType: 'birthday' } },
    });
    expect(mapped.fields.allDay).toBe(true);
    expect(mapped.fields.type).toBe(CalendarEventType.BIRTHDAY);
    expect(mapped.fields.startsAt.toISOString()).toBe(
      '2026-08-01T00:00:00.000Z',
    );
    expect(mapped.fields.endsAt.toISOString()).toBe('2026-08-01T00:00:00.000Z');
  });

  it('defaults type to other and warns on unsupported RRULE parts', () => {
    const mapped = mapGoogleEventToAicFields({
      summary: 'Externo',
      start: { dateTime: '2026-07-20T10:00:00.000Z' },
      end: { dateTime: '2026-07-20T11:00:00.000Z' },
      recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO'],
    });
    expect(mapped.fields.type).toBe(CalendarEventType.OTHER);
    expect(mapped.warnings).toContain('UNSUPPORTED_RRULE_PARTS');
  });
});
