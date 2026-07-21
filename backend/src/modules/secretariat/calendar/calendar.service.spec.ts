import { Repository } from 'typeorm';
import { ApiException } from '../../../common/errors/api.exception';
import { CongregationsService } from '../../congregations/congregations.service';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import {
  CalendarEventType,
  CalendarRecurrenceFrequency,
} from '../enums/secretariat.enums';
import { ICS_IMPORT_MAX_VEVENTS } from './calendar-ics.util';
import { CalendarService } from './calendar.service';
import { CalendarEvent } from './entities/calendar-event.entity';

describe('CalendarService', () => {
  const findOne = jest.fn();
  const save = jest.fn((value: object) => value);
  const create = jest.fn((value: object) => value);
  const createQueryBuilder = jest.fn();
  const calendarEventsRepository = {
    findOne,
    save,
    create,
    createQueryBuilder,
  } as unknown as Repository<CalendarEvent>;
  const getOrCreateBaseMock = jest
    .fn()
    .mockResolvedValue({ id: 'congregation-1' });
  const getByIdMock = jest
    .fn()
    .mockResolvedValue({ id: 'congregation-1', name: 'Igreja Central' });
  const congregationsService = {
    getOrCreateBase: getOrCreateBaseMock,
    getById: getByIdMock,
  } as unknown as CongregationsService;
  const service = new CalendarService(
    calendarEventsRepository,
    congregationsService,
  );
  const user = { id: 'user-1' } as UserResponseDto;

  beforeEach(() => jest.clearAllMocks());

  it('rejeita ends_at anterior a starts_at na criação', async () => {
    await expect(
      service.createEvent(
        {
          title: 'Culto de celebração',
          type: CalendarEventType.SERVICE,
          startsAt: '2026-07-20T20:00:00.000Z',
          endsAt: '2026-07-20T19:00:00.000Z',
          allDay: false,
        },
        user,
      ),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('aceita ends_at igual a starts_at', async () => {
    save.mockResolvedValue({
      id: 'event-1',
      congregationId: 'congregation-1',
      createdByUserId: 'user-1',
      title: 'Reunião rápida',
      type: CalendarEventType.MEETING,
      startsAt: new Date('2026-07-20T19:00:00.000Z'),
      endsAt: new Date('2026-07-20T19:00:00.000Z'),
      allDay: false,
      location: null,
      description: null,
      recurrenceFrequency: 'none',
      recurrenceInterval: 1,
      recurrenceUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.createEvent(
        {
          title: 'Reunião rápida',
          type: CalendarEventType.MEETING,
          startsAt: '2026-07-20T19:00:00.000Z',
          endsAt: '2026-07-20T19:00:00.000Z',
          allDay: false,
        },
        user,
      ),
    ).resolves.toMatchObject({ id: 'event-1' });
  });

  it('rejeita ends_at anterior a starts_at na atualização', async () => {
    findOne.mockResolvedValue({
      id: 'event-1',
      congregationId: 'congregation-1',
      startsAt: new Date('2026-07-20T19:00:00.000Z'),
      endsAt: new Date('2026-07-20T21:00:00.000Z'),
    });

    await expect(
      service.updateEvent('event-1', {
        endsAt: '2026-07-20T18:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('lança ApiException quando o evento não existe na congregação', async () => {
    findOne.mockResolvedValue(null);

    await expect(service.findEvent('event-x')).rejects.toBeInstanceOf(
      ApiException,
    );
    expect(findOne).toHaveBeenCalledWith({
      where: { id: 'event-x', congregationId: 'congregation-1' },
    });
  });

  it('findEvents com activeCongregationId não chama getOrCreateBase', async () => {
    const explicitId = '22222222-3333-4444-5555-666666666666';
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    createQueryBuilder.mockReturnValue(qb);
    jest.clearAllMocks();
    getOrCreateBaseMock.mockResolvedValue({ id: 'congregation-1' });

    await service.findEvents({ page: 1, limit: 20 }, explicitId);

    expect(getOrCreateBaseMock).not.toHaveBeenCalled();
    expect(qb.where).toHaveBeenCalledWith(
      'event.congregationId = :congregationId',
      {
        congregationId: explicitId,
      },
    );
  });

  it('exportEventAsIcs gera VEVENT com UID virtual', async () => {
    findOne.mockResolvedValue({
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      congregationId: 'congregation-1',
      title: 'Culto',
      type: CalendarEventType.SERVICE,
      startsAt: new Date('2026-07-20T19:00:00.000Z'),
      endsAt: new Date('2026-07-20T21:00:00.000Z'),
      allDay: false,
      location: null,
      description: null,
      recurrenceFrequency: CalendarRecurrenceFrequency.NONE,
      recurrenceInterval: 1,
      recurrenceUntil: null,
    });

    const ics = await service.exportEventAsIcs(
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    );
    expect(ics).toContain(
      'UID:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee@igreja-central',
    );
    expect(ics).toContain('PRODID:-//Igreja Central//Secretariat Calendar//EN');
    expect(ics).toContain('SUMMARY:Culto');
    expect(getByIdMock).toHaveBeenCalledWith('congregation-1');
  });

  it('exportRangeAsIcs rejeita from >= to', async () => {
    await expect(
      service.exportRangeAsIcs({
        from: '2026-07-31T00:00:00.000Z',
        to: '2026-07-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('importFromIcs processa até 100 e marca o restante LIMIT_EXCEEDED', async () => {
    let counter = 0;
    save.mockImplementation((value: object) => {
      counter += 1;
      return {
        ...value,
        id: `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceMemberId: null,
      };
    });

    const blocks = Array.from({ length: ICS_IMPORT_MAX_VEVENTS + 3 }, (_, i) =>
      [
        'BEGIN:VEVENT',
        `SUMMARY:Evento ${i}`,
        'DTSTART:20260720T190000Z',
        'DTEND:20260720T200000Z',
        'END:VEVENT',
      ].join('\r\n'),
    );
    const raw = `BEGIN:VCALENDAR\r\n${blocks.join('\r\n')}\r\nEND:VCALENDAR\r\n`;

    const result = await service.importFromIcs(raw, user);
    expect(result.created).toBe(ICS_IMPORT_MAX_VEVENTS);
    expect(result.createdIds).toHaveLength(ICS_IMPORT_MAX_VEVENTS);
    expect(
      result.skipped.filter((s) => s.reason === 'LIMIT_EXCEEDED'),
    ).toHaveLength(3);
  });

  it('importFromIcs rejeita arquivo sem VEVENT', async () => {
    await expect(
      service.importFromIcs('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n', user),
    ).rejects.toBeInstanceOf(ApiException);
  });
});
