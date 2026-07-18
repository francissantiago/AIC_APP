import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { ApiErrorCode } from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { Member } from '../members/entities/member.entity';
import { MemberStatus } from '../members/enums/member-status.enum';
import { MinistryMember } from '../ministries/entities/ministry-member.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import { MinistryMemberRole } from '../ministries/enums/ministry-member-role.enum';
import { MinistryStatus } from '../ministries/enums/ministry-status.enum';
import { CalendarEvent } from '../secretariat/calendar/entities/calendar-event.entity';
import { CalendarEventType } from '../secretariat/enums/secretariat.enums';
import { ScheduleAssignment } from './entities/schedule-assignment.entity';
import { SchedulesService } from './schedules.service';

describe('SchedulesService', () => {
  let service: SchedulesService;

  const congregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const eventId = '11111111-2222-3333-4444-555555555555';
  const ministryId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const memberId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
  const otherMemberId = 'cccccccc-dddd-eeee-ffff-111111111111';
  const assignmentId = 'dddddddd-eeee-ffff-aaaa-bbbbbbbbbbbb';

  const assignmentsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const eventsRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const ministriesRepository = {
    findOne: jest.fn(),
  };
  const ministryMembersRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const membersRepository = {
    findOne: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(),
  };

  const baseEvent = (overrides?: Partial<CalendarEvent>): CalendarEvent => {
    const event = new CalendarEvent();
    event.id = eventId;
    event.congregationId = congregationId;
    event.title = 'Culto Domingo';
    event.type = CalendarEventType.SERVICE;
    event.startsAt = new Date('2026-07-19T19:00:00.000Z');
    event.endsAt = new Date('2026-07-19T21:00:00.000Z');
    event.deletedAt = null;
    Object.assign(event, overrides);
    return event;
  };

  const baseMinistry = (overrides?: Partial<Ministry>): Ministry => {
    const ministry = new Ministry();
    ministry.id = ministryId;
    ministry.congregationId = congregationId;
    ministry.name = 'Louvor';
    ministry.status = MinistryStatus.ACTIVE;
    ministry.deletedAt = null;
    Object.assign(ministry, overrides);
    return ministry;
  };

  const baseMember = (overrides?: Partial<Member>): Member => {
    const member = new Member();
    member.id = memberId;
    member.fullName = 'Maria da Silva';
    member.status = MemberStatus.ACTIVE;
    member.congregationId = congregationId;
    member.deletedAt = null;
    Object.assign(member, overrides);
    return member;
  };

  const baseAssignment = (
    overrides?: Partial<ScheduleAssignment>,
  ): ScheduleAssignment => {
    const assignment = new ScheduleAssignment();
    assignment.id = assignmentId;
    assignment.calendarEventId = eventId;
    assignment.ministryId = ministryId;
    assignment.memberId = memberId;
    assignment.roleLabel = 'Vocal';
    assignment.confirmed = false;
    assignment.notes = null;
    assignment.createdAt = new Date('2026-07-18T00:00:00.000Z');
    assignment.updatedAt = new Date('2026-07-18T00:00:00.000Z');
    assignment.calendarEvent = baseEvent();
    assignment.ministry = baseMinistry();
    assignment.member = baseMember();
    Object.assign(assignment, overrides);
    return assignment;
  };

  const mockAssignmentQb = (
    rows: ScheduleAssignment[],
    total = rows.length,
  ) => {
    const qb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(rows[0] ?? null),
      getMany: jest.fn().mockResolvedValue(rows),
      getManyAndCount: jest.fn().mockResolvedValue([rows, total]),
    };
    assignmentsRepository.createQueryBuilder.mockReturnValue(qb);
    return qb;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        {
          provide: getRepositoryToken(ScheduleAssignment),
          useValue: assignmentsRepository,
        },
        {
          provide: getRepositoryToken(CalendarEvent),
          useValue: eventsRepository,
        },
        {
          provide: getRepositoryToken(Ministry),
          useValue: ministriesRepository,
        },
        {
          provide: getRepositoryToken(MinistryMember),
          useValue: ministryMembersRepository,
        },
        {
          provide: getRepositoryToken(Member),
          useValue: membersRepository,
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(SchedulesService);
  });

  describe('create', () => {
    it('deve criar atribuição válida', async () => {
      const saved = baseAssignment();
      eventsRepository.findOne.mockResolvedValue(baseEvent());
      ministriesRepository.findOne.mockResolvedValue(baseMinistry());
      membersRepository.findOne.mockResolvedValue(baseMember());
      ministryMembersRepository.findOne.mockResolvedValue({
        ministryId,
        memberId,
        role: MinistryMemberRole.MEMBER,
      });
      assignmentsRepository.create.mockReturnValue(saved);
      assignmentsRepository.save.mockResolvedValue(saved);
      mockAssignmentQb([saved]);

      const result = await service.create({
        calendarEventId: eventId,
        ministryId,
        memberId,
        roleLabel: 'Vocal',
      });

      expect(result.id).toBe(assignmentId);
      expect(result.roleLabel).toBe('Vocal');
      expect(result.event.title).toBe('Culto Domingo');
    });

    it('deve rejeitar membro fora do ministério', async () => {
      eventsRepository.findOne.mockResolvedValue(baseEvent());
      ministriesRepository.findOne.mockResolvedValue(baseMinistry());
      membersRepository.findOne.mockResolvedValue(baseMember());
      ministryMembersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          calendarEventId: eventId,
          ministryId,
          memberId,
          roleLabel: 'Vocal',
        }),
      ).rejects.toMatchObject({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        response: { code: ApiErrorCode.SCHEDULES_MEMBER_NOT_IN_MINISTRY },
      });
    });

    it('deve rejeitar ministério inactive', async () => {
      eventsRepository.findOne.mockResolvedValue(baseEvent());
      ministriesRepository.findOne.mockResolvedValue(
        baseMinistry({ status: MinistryStatus.INACTIVE }),
      );

      await expect(
        service.create({
          calendarEventId: eventId,
          ministryId,
          memberId,
          roleLabel: 'Vocal',
        }),
      ).rejects.toMatchObject({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        response: { code: ApiErrorCode.SCHEDULES_MINISTRY_INACTIVE },
      });
    });

    it('deve mapear UNIQUE para ASSIGNMENT_CONFLICT', async () => {
      eventsRepository.findOne.mockResolvedValue(baseEvent());
      ministriesRepository.findOne.mockResolvedValue(baseMinistry());
      membersRepository.findOne.mockResolvedValue(baseMember());
      ministryMembersRepository.findOne.mockResolvedValue({
        ministryId,
        memberId,
      });
      assignmentsRepository.create.mockReturnValue(baseAssignment());
      assignmentsRepository.save.mockRejectedValue(
        new QueryFailedError('INSERT', [], {
          code: 'ER_DUP_ENTRY',
        } as never),
      );

      await expect(
        service.create({
          calendarEventId: eventId,
          ministryId,
          memberId,
          roleLabel: 'Vocal',
        }),
      ).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
        response: { code: ApiErrorCode.SCHEDULES_ASSIGNMENT_CONFLICT },
      });
    });
  });

  describe('getWeekView', () => {
    it('deve filtrar eventos soft-deleted', async () => {
      const eventsQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([baseEvent()]),
      };
      eventsRepository.createQueryBuilder.mockReturnValue(eventsQb);
      mockAssignmentQb([baseAssignment()]);

      const result = await service.getWeekView({
        from: '2026-07-13',
        to: '2026-07-19',
      });

      expect(eventsQb.where).toHaveBeenCalledWith('event.deletedAt IS NULL');
      expect(result.events).toHaveLength(1);
      expect(result.events[0].ministries[0].assignments).toHaveLength(1);
    });
  });

  describe('bulkUpsert', () => {
    it('deve substituir o conjunto do par evento+ministério', async () => {
      eventsRepository.findOne.mockResolvedValue(baseEvent());
      ministriesRepository.findOne.mockResolvedValue(baseMinistry());
      membersRepository.findOne.mockResolvedValue(baseMember());
      ministryMembersRepository.findOne.mockResolvedValue({
        ministryId,
        memberId,
      });

      const existingOther = baseAssignment({
        id: 'eeeeeeee-ffff-aaaa-bbbb-cccccccccccc',
        memberId: otherMemberId,
      });
      const txRepo = {
        find: jest.fn().mockResolvedValue([existingOther]),
        remove: jest.fn().mockResolvedValue(undefined),
        create: jest
          .fn()
          .mockImplementation((data: ScheduleAssignment) => data),
        save: jest.fn().mockImplementation((data: ScheduleAssignment) => data),
      };
      dataSource.transaction.mockImplementation(
        async (
          cb: (manager: {
            getRepository: () => typeof txRepo;
          }) => Promise<void>,
        ) => cb({ getRepository: () => txRepo }),
      );

      const finalAssignment = baseAssignment();
      mockAssignmentQb([finalAssignment]);

      const result = await service.bulkUpsert(eventId, ministryId, {
        items: [{ memberId, roleLabel: 'Vocal', confirmed: true }],
      });

      expect(txRepo.remove).toHaveBeenCalledWith([existingOther]);
      expect(txRepo.save).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].memberId).toBe(memberId);
    });
  });

  describe('update / remove', () => {
    it('deve atualizar confirmed via PATCH', async () => {
      const assignment = baseAssignment();
      mockAssignmentQb([assignment]);
      assignmentsRepository.save.mockResolvedValue(assignment);

      const result = await service.update(assignmentId, { confirmed: true });

      expect(assignmentsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ confirmed: true }),
      );
      expect(result.confirmed).toBe(true);
    });

    it('deve remover atribuição (hard delete)', async () => {
      const assignment = baseAssignment();
      mockAssignmentQb([assignment]);
      assignmentsRepository.remove.mockResolvedValue(assignment);

      await service.remove(assignmentId);

      expect(assignmentsRepository.remove).toHaveBeenCalledWith(assignment);
    });

    it('deve lançar NOT_FOUND quando atribuição inexistente', async () => {
      mockAssignmentQb([]);

      await expect(service.findOne(assignmentId)).rejects.toBeInstanceOf(
        ApiException,
      );
      await expect(service.findOne(assignmentId)).rejects.toMatchObject({
        response: { code: ApiErrorCode.SCHEDULES_NOT_FOUND },
      });
    });
  });
});
