import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CongregationsService } from '../../congregations/congregations.service';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import { CalendarEventType } from '../enums/secretariat.enums';
import { CalendarService } from './calendar.service';
import { CalendarEvent } from './entities/calendar-event.entity';

describe('CalendarService', () => {
  const findOne = jest.fn();
  const save = jest.fn((value: object) => value);
  const create = jest.fn((value: object) => value);
  const calendarEventsRepository = {
    findOne,
    save,
    create,
  } as unknown as Repository<CalendarEvent>;
  const congregationsService = {
    getOrCreateBase: jest.fn().mockResolvedValue({ id: 'congregation-1' }),
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
    ).rejects.toBeInstanceOf(BadRequestException);
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
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lança NotFoundException quando o evento não existe na congregação', async () => {
    findOne.mockResolvedValue(null);

    await expect(service.findEvent('event-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findOne).toHaveBeenCalledWith({
      where: { id: 'event-x', congregationId: 'congregation-1' },
    });
  });
});
