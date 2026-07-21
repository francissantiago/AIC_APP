import {
  CalendarEventType,
  CalendarRecurrenceFrequency,
} from '../enums/secretariat.enums';
import {
  buildIcsCalendar,
  escapeIcsText,
  foldIcsLine,
  mapParsedVEventToCreateInput,
  parseIcsCalendar,
  unfoldIcs,
} from './calendar-ics.util';

describe('calendar-ics.util', () => {
  const dtstamp = new Date('2026-07-20T12:00:00.000Z');
  const congregationName = 'Igreja Central';

  it('exporta evento all-day com VALUE=DATE e DTEND exclusivo', () => {
    const ics = buildIcsCalendar(
      [
        {
          id: '11111111-1111-1111-1111-111111111111',
          title: 'Retiro',
          startsAt: new Date('2026-08-01T00:00:00.000Z'),
          endsAt: new Date('2026-08-02T00:00:00.000Z'),
          allDay: true,
          type: CalendarEventType.OTHER,
        },
      ],
      { congregationName, dtstamp },
    );

    expect(ics).toContain('DTSTART;VALUE=DATE:20260801');
    expect(ics).toContain('DTEND;VALUE=DATE:20260802');
    expect(ics).toContain(
      'UID:11111111-1111-1111-1111-111111111111@igreja-central',
    );
    expect(ics).toContain('PRODID:-//Igreja Central//Secretariat Calendar//EN');
  });

  it('exporta evento timed em UTC com RRULE weekly+interval+until', () => {
    const ics = buildIcsCalendar(
      [
        {
          id: '22222222-2222-2222-2222-222222222222',
          title: 'Ensaio',
          startsAt: new Date('2026-07-05T22:00:00.000Z'),
          endsAt: new Date('2026-07-06T00:00:00.000Z'),
          allDay: false,
          type: CalendarEventType.REHEARSAL,
          recurrenceFrequency: CalendarRecurrenceFrequency.WEEKLY,
          recurrenceInterval: 2,
          recurrenceUntil: '2026-07-26',
        },
      ],
      { congregationName, dtstamp },
    );

    expect(ics).toContain('DTSTART:20260705T220000Z');
    expect(ics).toContain('DTEND:20260706T000000Z');
    expect(ics).toContain(
      'RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20260726T000000Z',
    );
    expect(ics).toContain('CATEGORIES:rehearsal');
  });

  it('escapa vírgula, ponto-e-vírgula e barra invertida', () => {
    expect(escapeIcsText('A, B; C\\D')).toBe('A\\, B\\; C\\\\D');
    const ics = buildIcsCalendar(
      [
        {
          id: '33333333-3333-3333-3333-333333333333',
          title: 'Culto, especial; nota\\x',
          startsAt: new Date('2026-07-20T19:00:00.000Z'),
          endsAt: new Date('2026-07-20T21:00:00.000Z'),
          allDay: false,
          location: 'Sala A, bloco 1',
          description: 'Linha1\nLinha2',
        },
      ],
      { congregationName, dtstamp },
    );
    expect(ics).toContain('SUMMARY:Culto\\, especial\\; nota\\\\x');
    expect(ics).toContain('LOCATION:Sala A\\, bloco 1');
    expect(ics).toContain('DESCRIPTION:Linha1\\nLinha2');
  });

  it('faz fold de linhas longas e unfold no parse', () => {
    const longTitle = `Evento ${'a'.repeat(80)}`;
    const ics = buildIcsCalendar(
      [
        {
          id: '44444444-4444-4444-4444-444444444444',
          title: longTitle,
          startsAt: new Date('2026-07-20T19:00:00.000Z'),
          endsAt: new Date('2026-07-20T20:00:00.000Z'),
          allDay: false,
        },
      ],
      { congregationName, dtstamp },
    );
    expect(ics).toMatch(/\r\n /);
    const folded = foldIcsLine(`SUMMARY:${longTitle}`);
    expect(unfoldIcs(folded)).toBe(`SUMMARY:${longTitle}`);
  });

  it('parseia VEVENT all-day e timed UTC', () => {
    const raw = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:ext-1@example.com',
      'SUMMARY:All day',
      'DTSTART;VALUE=DATE:20260810',
      'DTEND;VALUE=DATE:20260811',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:ext-2@example.com',
      'SUMMARY:Timed',
      'DTSTART:20260810T190000Z',
      'DTEND:20260810T210000Z',
      'CATEGORIES:meeting',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const events = parseIcsCalendar(raw);
    expect(events).toHaveLength(2);
    expect(events[0].allDay).toBe(true);
    expect(events[0].startsAt?.toISOString()).toBe('2026-08-10T00:00:00.000Z');
    expect(events[1].allDay).toBe(false);
    expect(events[1].categories).toEqual(['meeting']);
  });

  it('mapeia timed sem DTEND para duração de 1h', () => {
    const mapped = mapParsedVEventToCreateInput({
      uid: 'u1',
      summary: 'Sem fim',
      description: null,
      location: null,
      startsAt: new Date('2026-07-20T19:00:00.000Z'),
      endsAt: null,
      allDay: false,
      categories: [],
      rrule: null,
    });
    expect(mapped.dto?.endsAt).toBe('2026-07-20T20:00:00.000Z');
  });

  it('importa RRULE com BYDAY como evento único + warning', () => {
    const mapped = mapParsedVEventToCreateInput({
      uid: 'u2',
      summary: 'Recorrente complexo',
      description: null,
      location: null,
      startsAt: new Date('2026-07-20T19:00:00.000Z'),
      endsAt: new Date('2026-07-20T21:00:00.000Z'),
      allDay: false,
      categories: ['service'],
      rrule: 'FREQ=WEEKLY;BYDAY=MO,WE;INTERVAL=1',
    });
    expect(mapped.dto?.recurrenceFrequency).toBe(
      CalendarRecurrenceFrequency.NONE,
    );
    expect(mapped.dto?.type).toBe(CalendarEventType.SERVICE);
    expect(mapped.warning?.reason).toBe('UNSUPPORTED_RRULE_PARTS');
    expect(mapped.skip).toBeUndefined();
  });

  it('ignora VEVENT sem SUMMARY como skip', () => {
    const mapped = mapParsedVEventToCreateInput({
      uid: 'u3',
      summary: null,
      description: null,
      location: null,
      startsAt: new Date('2026-07-20T19:00:00.000Z'),
      endsAt: new Date('2026-07-20T20:00:00.000Z'),
      allDay: false,
      categories: [],
      rrule: null,
    });
    expect(mapped.skip?.reason).toBe('MISSING_SUMMARY');
  });

  it('parseia lote com VEVENT inválido parcial', () => {
    const raw = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'SUMMARY:Ok',
      'DTSTART:20260720T190000Z',
      'DTEND:20260720T200000Z',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'DTSTART:20260721T190000Z',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');
    const events = parseIcsCalendar(raw);
    expect(events).toHaveLength(2);
    const first = mapParsedVEventToCreateInput(events[0]);
    const second = mapParsedVEventToCreateInput(events[1]);
    expect(first.dto).toBeDefined();
    expect(second.skip?.reason).toBe('MISSING_SUMMARY');
  });

  it('parseia mais de 100 VEVENTs para o service aplicar LIMIT_EXCEEDED', () => {
    const blocks = Array.from({ length: 105 }, (_, index) =>
      [
        'BEGIN:VEVENT',
        `UID:evt-${index}@example.com`,
        `SUMMARY:Evento ${index}`,
        'DTSTART:20260720T190000Z',
        'DTEND:20260720T200000Z',
        'END:VEVENT',
      ].join('\r\n'),
    );
    const raw = `BEGIN:VCALENDAR\r\n${blocks.join('\r\n')}\r\nEND:VCALENDAR\r\n`;
    expect(parseIcsCalendar(raw)).toHaveLength(105);
  });
});
