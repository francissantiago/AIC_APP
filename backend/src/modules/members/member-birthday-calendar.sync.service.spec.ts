import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CalendarEvent } from '../secretariat/calendar/entities/calendar-event.entity';
import {
  CalendarEventType,
  CalendarRecurrenceFrequency,
} from '../secretariat/enums/secretariat.enums';
import { Member } from './entities/member.entity';
import { MemberStatus } from './enums/member-status.enum';
import {
  anchorBirthdayEndsAt,
  anchorBirthdayStartsAt,
  buildBirthdayTitle,
  MemberBirthdayCalendarSyncService,
} from './member-birthday-calendar.sync.service';

describe('MemberBirthdayCalendarSyncService', () => {
  let service: MemberBirthdayCalendarSyncService;

  const congregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const actorUserId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const memberId = '11111111-2222-3333-4444-555555555555';

  const calendarEventsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
  };

  const ctx = { actorUserId, congregationId };

  const baseMember = (overrides: Partial<Member> = {}): Member => {
    const member = new Member();
    member.id = memberId;
    member.fullName = 'Juliana Bezerra Facre';
    member.birthDate = '1945-07-19';
    member.status = MemberStatus.ACTIVE;
    member.congregationId = congregationId;
    member.deletedAt = null;
    Object.assign(member, overrides);
    return member;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberBirthdayCalendarSyncService,
        {
          provide: getRepositoryToken(CalendarEvent),
          useValue: calendarEventsRepository,
        },
      ],
    }).compile();

    service = module.get(MemberBirthdayCalendarSyncService);
  });

  describe('syncOnCreate', () => {
    it('deve criar evento de aniversário para membro active com birthDate', async () => {
      calendarEventsRepository.findOne.mockResolvedValue(null);
      const created = { id: 'event-id' } as CalendarEvent;
      calendarEventsRepository.create.mockImplementation(
        (payload: Partial<CalendarEvent>) => payload as CalendarEvent,
      );
      calendarEventsRepository.save.mockResolvedValue(created);

      await service.syncOnCreate(baseMember(), ctx);

      expect(calendarEventsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceMemberId: memberId,
          type: CalendarEventType.BIRTHDAY,
          allDay: true,
          recurrenceFrequency: CalendarRecurrenceFrequency.YEARLY,
          title: buildBirthdayTitle('Juliana Bezerra Facre'),
        }),
      );
      expect(calendarEventsRepository.save).toHaveBeenCalled();
    });

    it('não deve criar evento quando birthDate é nulo', async () => {
      await service.syncOnCreate(baseMember({ birthDate: null }), ctx);

      expect(calendarEventsRepository.create).not.toHaveBeenCalled();
      expect(calendarEventsRepository.softRemove).not.toHaveBeenCalled();
    });

    it('deve atualizar evento existente quando membro já possui vínculo', async () => {
      const existing = {
        id: 'existing-event',
        deletedAt: new Date(),
      } as CalendarEvent;
      calendarEventsRepository.findOne.mockResolvedValue(existing);
      calendarEventsRepository.save.mockResolvedValue(existing);

      await service.syncOnCreate(baseMember({ fullName: 'Nome Novo' }), ctx);

      expect(existing.deletedAt).toBeNull();
      expect(existing.title).toBe(buildBirthdayTitle('Nome Novo'));
      expect(calendarEventsRepository.save).toHaveBeenCalledWith(existing);
    });
  });

  describe('syncOnUpdate', () => {
    it('deve remover evento quando status deixa de ser active', async () => {
      const existing = { id: 'existing-event' } as CalendarEvent;
      calendarEventsRepository.findOne.mockResolvedValue(existing);
      calendarEventsRepository.softRemove.mockResolvedValue(existing);

      await service.syncOnUpdate(
        baseMember(),
        baseMember({ status: MemberStatus.INACTIVE }),
        ctx,
      );

      expect(calendarEventsRepository.softRemove).toHaveBeenCalledWith(
        existing,
      );
    });

    it('deve atualizar datas quando birthDate muda', async () => {
      const existing = {
        id: 'existing-event',
        deletedAt: null,
      } as CalendarEvent;
      calendarEventsRepository.findOne.mockResolvedValue(existing);
      calendarEventsRepository.save.mockResolvedValue(existing);

      await service.syncOnUpdate(
        baseMember({ birthDate: '1945-07-19' }),
        baseMember({ birthDate: '1990-03-17' }),
        ctx,
      );

      expect(existing.startsAt).toEqual(anchorBirthdayStartsAt('1990-03-17'));
      expect(existing.endsAt).toEqual(anchorBirthdayEndsAt('1990-03-17'));
    });
  });

  describe('syncOnRemove', () => {
    it('deve soft-delete evento vinculado ao membro', async () => {
      const existing = { id: 'existing-event' } as CalendarEvent;
      calendarEventsRepository.findOne.mockResolvedValue(existing);
      calendarEventsRepository.softRemove.mockResolvedValue(existing);

      await service.syncOnRemove(baseMember());

      expect(calendarEventsRepository.softRemove).toHaveBeenCalledWith(
        existing,
      );
    });
  });
});
