import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CongregationsService } from '../congregations/congregations.service';
import { AnnouncementsService } from '../announcements/announcements.service';
import { Member } from '../members/entities/member.entity';
import { MemberStatus } from '../members/enums/member-status.enum';
import { ScheduleAssignment } from '../schedules/entities/schedule-assignment.entity';
import { Visitor } from '../secretariat/visitors/entities/visitor.entity';
import { User } from '../users/entities/user.entity';
import { UserStatus } from '../users/enums/user-status.enum';
import { NotificationReferenceType } from './enums/notification-reference-type.enum';
import { NotificationType } from './enums/notification-type.enum';
import { CreateNotificationInput } from './notifications.service';
import {
  buildBirthdayReferenceId,
  NotificationsJobsService,
} from './notifications-jobs.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsJobsService', () => {
  let service: NotificationsJobsService;

  const congregationId = 'cccccccc-dddd-eeee-ffff-000000000001';
  const secretariatUserId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const memberUserId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
  const birthdayMemberId = '83e2160e-7fc9-4b94-8ff2-6e9398f67f54';

  const visitorsRepository = {
    createQueryBuilder: jest.fn(),
  };
  const scheduleAssignmentsRepository = {
    createQueryBuilder: jest.fn(),
  };
  const membersRepository = {
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
  const upsertDailyBirthdayBoard = jest.fn<
    Promise<'created' | 'updated' | 'unchanged'>,
    [string, { fullName: string; birthDate: string }[], string]
  >();
  const announcementsService = {
    upsertDailyBirthdayBoard,
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

  const mockMembersQb = (members: Member[]) => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(members),
    };
    membersRepository.createQueryBuilder.mockReturnValue(qb);
    return qb;
  };

  const mockMemberManagementQb = (ids: string[]) => {
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

  const mockUsersQbSequence = (batches: string[][]) => {
    let call = 0;
    usersRepository.createQueryBuilder.mockImplementation(() => {
      const ids = batches[call] ?? [];
      call += 1;
      return {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(ids.map((id) => ({ id }))),
      };
    });
  };

  const baseMember = (overrides?: Partial<Member>): Member => {
    const member = new Member();
    member.id = birthdayMemberId;
    member.congregationId = congregationId;
    member.fullName = 'Juliana Bezerra Facre';
    member.birthDate = '1945-07-19';
    member.status = MemberStatus.ACTIVE;
    member.deletedAt = null;
    Object.assign(member, overrides);
    return member;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    congregationsService.getOrCreateBase.mockResolvedValue({
      id: congregationId,
    });
    createIfAbsent.mockResolvedValue({ id: 'created' });
    upsertDailyBirthdayBoard.mockResolvedValue('created');

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
          provide: getRepositoryToken(Member),
          useValue: membersRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: AnnouncementsService, useValue: announcementsService },
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

  describe('handleMemberBirthday', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: new Date('2026-07-19T08:00:00-03:00') });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('deve notificar destinatários para membro aniversariante', async () => {
      mockMemberManagementQb([secretariatUserId]);
      mockMembersQb([baseMember()]);

      await service.handleMemberBirthday();

      expect(upsertDailyBirthdayBoard).toHaveBeenCalledWith(
        congregationId,
        [
          {
            fullName: 'Juliana Bezerra Facre',
            birthDate: '1945-07-19',
          },
        ],
        secretariatUserId,
      );
      expect(createIfAbsent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: secretariatUserId,
          type: NotificationType.MEMBER_BIRTHDAY,
          referenceType: NotificationReferenceType.MEMBER,
          referenceId: buildBirthdayReferenceId(birthdayMemberId, 2026),
          title: 'Aniversariante do dia',
        }),
      );
    });

    it('deve ignorar quando não há membros elegíveis', async () => {
      mockMemberManagementQb([secretariatUserId]);
      mockMembersQb([]);

      await service.handleMemberBirthday();

      expect(upsertDailyBirthdayBoard).not.toHaveBeenCalled();
      expect(createIfAbsent).not.toHaveBeenCalled();
    });

    it('deve publicar mural mesmo sem destinatários de notificação', async () => {
      mockUsersQbSequence([[], [secretariatUserId], []]);
      mockMembersQb([baseMember()]);

      await service.handleMemberBirthday();

      expect(upsertDailyBirthdayBoard).toHaveBeenCalledWith(
        congregationId,
        [
          {
            fullName: 'Juliana Bezerra Facre',
            birthDate: '1945-07-19',
          },
        ],
        secretariatUserId,
      );
      expect(createIfAbsent).not.toHaveBeenCalled();
    });

    it('não deve abortar notificações se mural falhar', async () => {
      mockMemberManagementQb([secretariatUserId]);
      mockMembersQb([baseMember()]);
      upsertDailyBirthdayBoard.mockRejectedValueOnce(new Error('board fail'));

      await expect(service.handleMemberBirthday()).resolves.toBeUndefined();
      expect(createIfAbsent).toHaveBeenCalledTimes(1);
    });

    it('deve ignorar notificações quando não há destinatários', async () => {
      mockUsersQbSequence([[], [secretariatUserId], []]);
      mockMembersQb([baseMember()]);

      await service.handleMemberBirthday();

      expect(upsertDailyBirthdayBoard).toHaveBeenCalledTimes(1);
      expect(createIfAbsent).not.toHaveBeenCalled();
    });

    it('não deve abortar o lote se um create falhar', async () => {
      mockMemberManagementQb([secretariatUserId, memberUserId]);
      mockMembersQb([baseMember()]);
      createIfAbsent
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({ id: 'ok' });

      await expect(service.handleMemberBirthday()).resolves.toBeUndefined();
      expect(createIfAbsent).toHaveBeenCalledTimes(2);
    });
  });

  describe('resolveMemberManagementUserIds', () => {
    it('deve consultar secretariat:read e members:read', async () => {
      const qb = mockMemberManagementQb([secretariatUserId]);

      const result = await service.resolveMemberManagementUserIds();

      expect(result).toEqual([secretariatUserId]);
      expect(qb.andWhere).toHaveBeenCalledWith('p.code IN (:...codes)', {
        codes: ['secretariat:read', 'members:read'],
      });
    });
  });
});
