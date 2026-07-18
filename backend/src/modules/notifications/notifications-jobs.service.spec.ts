import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CongregationsService } from '../congregations/congregations.service';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { Visitor } from '../secretariat/visitors/entities/visitor.entity';
import { User } from '../users/entities/user.entity';
import { UserStatus } from '../users/enums/user-status.enum';
import { NotificationReferenceType } from './enums/notification-reference-type.enum';
import { NotificationType } from './enums/notification-type.enum';
import { CreateNotificationInput } from './notifications.service';
import { NotificationsJobsService } from './notifications-jobs.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsJobsService', () => {
  let service: NotificationsJobsService;

  const congregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const secretariatUserId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const memberUserId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';

  const visitorsRepository = {
    createQueryBuilder: jest.fn(),
  };
  const scheduleAssignmentsRepository = {
    createQueryBuilder: jest.fn(),
  };
  const usersRepository = {
    createQueryBuilder: jest.fn(),
  };
  const createIfAbsent = jest.fn<
    Promise<{ id: string } | null>,
    [CreateNotificationInput]
  >();
  const notificationsService = {
    createIfAbsent,
  };
  const congregationsService = {
    getOrCreateBase: jest.fn(),
  };

  const baseVisitor = (overrides?: Partial<Visitor>): Visitor => {
    const visitor = new Visitor();
    visitor.id = '11111111-2222-3333-4444-555555555555';
    visitor.congregationId = congregationId;
    visitor.fullName = 'Maria Visitante';
    visitor.visitDate = '2026-07-01';
    visitor.followUpDone = false;
    visitor.deletedAt = null;
    Object.assign(visitor, overrides);
    return visitor;
  };

  const mockVisitorsQb = (visitors: Visitor[]) => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(visitors),
    };
    visitorsRepository.createQueryBuilder.mockReturnValue(qb);
    return qb;
  };

  const mockSecretariatQb = (ids: string[]) => {
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(ids.map((id) => ({ id }))),
    };
    usersRepository.createQueryBuilder.mockReturnValue(qb);
    return qb;
  };

  const mockScheduleQb = (rows: Record<string, unknown>[]) => {
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(rows),
    };
    scheduleAssignmentsRepository.createQueryBuilder.mockReturnValue(qb);
    return qb;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    congregationsService.getOrCreateBase.mockResolvedValue({
      id: congregationId,
    });
    createIfAbsent.mockResolvedValue({ id: 'created' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsJobsService,
        {
          provide: getRepositoryToken(Visitor),
          useValue: visitorsRepository,
        },
        {
          provide: getRepositoryToken(ScheduleAssignment),
          useValue: scheduleAssignmentsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: CongregationsService, useValue: congregationsService },
      ],
    }).compile();

    service = module.get(NotificationsJobsService);
  });

  describe('handleVisitorFollowUp', () => {
    it('deve notificar users S6 para visitor elegível (8+ dias)', async () => {
      mockSecretariatQb([secretariatUserId]);
      mockVisitorsQb([baseVisitor()]);

      await service.handleVisitorFollowUp();

      expect(createIfAbsent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: secretariatUserId,
          type: NotificationType.VISITOR_FOLLOW_UP,
          referenceType: NotificationReferenceType.VISITOR,
          referenceId: '11111111-2222-3333-4444-555555555555',
        }),
      );
    });

    it('deve ignorar quando não há elegíveis', async () => {
      mockSecretariatQb([secretariatUserId]);
      mockVisitorsQb([]);

      await service.handleVisitorFollowUp();

      expect(createIfAbsent).not.toHaveBeenCalled();
    });

    it('não deve abortar o lote se um create falhar', async () => {
      mockSecretariatQb([secretariatUserId, memberUserId]);
      mockVisitorsQb([baseVisitor()]);
      createIfAbsent
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({ id: 'ok' });

      await expect(service.handleVisitorFollowUp()).resolves.toBeUndefined();
      expect(createIfAbsent).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleScheduleReminder', () => {
    const assignmentId = '22222222-3333-4444-5555-666666666666';

    it('deve notificar member.user_id quando ativo', async () => {
      mockScheduleQb([
        {
          assignmentId,
          calendarEventId: '33333333-4444-5555-6666-777777777777',
          eventTitle: 'Culto',
          startsAt: new Date('2026-07-19T19:00:00.000Z'),
          roleLabel: 'Louvor',
          memberId: '44444444-5555-6666-7777-888888888888',
          memberFullName: 'João Membro',
          memberUserId,
          memberUserStatus: UserStatus.ACTIVE,
        },
      ]);

      await service.handleScheduleReminder();

      expect(createIfAbsent).toHaveBeenCalledTimes(1);
      const memberCall = createIfAbsent.mock.calls[0][0];
      expect(memberCall).toMatchObject({
        userId: memberUserId,
        type: NotificationType.SCHEDULE_REMINDER,
        referenceType: NotificationReferenceType.SCHEDULE_ASSIGNMENT,
        referenceId: assignmentId,
      });
      expect(memberCall.body).toContain('Você está escalado');
      expect(usersRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('deve notificar secretaria quando member sem user_id', async () => {
      mockScheduleQb([
        {
          assignmentId,
          calendarEventId: '33333333-4444-5555-6666-777777777777',
          eventTitle: 'Culto',
          startsAt: new Date('2026-07-19T19:00:00.000Z'),
          roleLabel: 'Louvor',
          memberId: '44444444-5555-6666-7777-888888888888',
          memberFullName: 'João Membro',
          memberUserId: null,
          memberUserStatus: null,
        },
      ]);
      mockSecretariatQb([secretariatUserId]);

      await service.handleScheduleReminder();

      expect(createIfAbsent).toHaveBeenCalledTimes(1);
      const secretariatCall = createIfAbsent.mock.calls[0][0];
      expect(secretariatCall).toMatchObject({
        userId: secretariatUserId,
        type: NotificationType.SCHEDULE_REMINDER,
      });
      expect(secretariatCall.body).toContain('O membro João Membro');
    });

    it('deve ignorar quando não há assignments elegíveis', async () => {
      mockScheduleQb([]);

      await service.handleScheduleReminder();

      expect(createIfAbsent).not.toHaveBeenCalled();
    });
  });
});
