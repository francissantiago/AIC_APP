import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DashboardService } from './dashboard.service';
import { Member } from '../members/entities/member.entity';
import { Visitor } from '../secretariat/visitors/entities/visitor.entity';
import { AttendanceRecord } from '../secretariat/attendance/entities/attendance-record.entity';
import { CalendarEvent } from '../secretariat/calendar/entities/calendar-event.entity';
import { FinancialEntry } from '../finance/entities/financial-entry.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Announcement } from '../announcements/entities/announcement.entity';
import { MemberStatus } from '../members/enums/member-status.enum';

describe('DashboardService', () => {
  let service: DashboardService;
  let membersRepository: jest.Mocked<Repository<Member>>;
  let visitorsRepository: jest.Mocked<Repository<Visitor>>;
  let attendanceRepository: jest.Mocked<Repository<AttendanceRecord>>;
  let calendarEventsRepository: jest.Mocked<Repository<CalendarEvent>>;
  let financialEntriesRepository: jest.Mocked<Repository<FinancialEntry>>;
  let notificationsRepository: jest.Mocked<Repository<Notification>>;
  let announcementsRepository: jest.Mocked<Repository<Announcement>>;

  const mockQueryBuilder = () => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    getCount: jest.fn(),
    clone: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getRepositoryToken(Member),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(Visitor),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(AttendanceRecord),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(CalendarEvent),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(FinancialEntry),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(Announcement),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder()),
          },
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    membersRepository = module.get(getRepositoryToken(Member));
    visitorsRepository = module.get(getRepositoryToken(Visitor));
    attendanceRepository = module.get(getRepositoryToken(AttendanceRecord));
    calendarEventsRepository = module.get(getRepositoryToken(CalendarEvent));
    financialEntriesRepository = module.get(getRepositoryToken(FinancialEntry));
    notificationsRepository = module.get(getRepositoryToken(Notification));
    announcementsRepository = module.get(getRepositoryToken(Announcement));
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('getOverview', () => {
    it('deve retornar overview com kpis nulos quando usuário não tem permissões', async () => {
      const userId = 'user-123';
      const congregationId = 'cong-123';
      const permissions: string[] = [];

      const qb = mockQueryBuilder();
      qb.getCount.mockResolvedValue(5);
      notificationsRepository.createQueryBuilder = jest.fn(() => qb);

      const result = await service.getOverview(
        userId,
        congregationId,
        permissions,
      );

      expect(result).toHaveProperty('generatedAt');
      expect(result.kpis.activeMembers).toBeNull();
      expect(result.kpis.visitorsThisMonth).toBeNull();
      expect(result.kpis.pendingFollowUps).toBeNull();
      expect(result.kpis.upcomingEventsCount).toBeNull();
      expect(result.kpis.unreadNotifications).toBe(5);
      expect(result.charts.membersByStatus).toBeNull();
      expect(result.charts.attendanceByMonth).toBeNull();
      expect(result.charts.financeByMonth).toBeNull();
      expect(result.upcomingEvents).toBeNull();
      expect(result.birthdaysThisWeek).toBeNull();
      expect(result.recentAnnouncements).toBeNull();
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].code).toBe('UNREAD_NOTIFICATIONS');
    });

    it('deve retornar overview completo quando usuário tem todas permissões', async () => {
      const userId = 'user-123';
      const congregationId = 'cong-123';
      const permissions = [
        'members:read',
        'secretariat:read',
        'finance:read',
        'announcements:read',
      ];

      let qbMembersCalls = 0;
      membersRepository.createQueryBuilder = jest.fn(() => {
        const qb = mockQueryBuilder();
        if (qbMembersCalls === 0) {
          qb.getCount.mockResolvedValue(50);
        } else if (qbMembersCalls === 1) {
          qb.getRawMany.mockResolvedValue([
            { status: MemberStatus.ACTIVE, count: '50' },
          ]);
        } else {
          qb.getMany.mockResolvedValue([]);
        }
        qbMembersCalls++;
        return qb;
      });

      const qbVisitors = mockQueryBuilder();
      qbVisitors.getCount.mockResolvedValue(10);
      visitorsRepository.createQueryBuilder = jest.fn(() => qbVisitors);

      const qbAttendance = mockQueryBuilder();
      qbAttendance.getOne.mockResolvedValue({
        totalPresent: 120,
        eventDate: '2026-07-20',
      });
      qbAttendance.getRawMany.mockResolvedValue([]);
      attendanceRepository.createQueryBuilder = jest.fn(() => qbAttendance);

      const qbCalendar = mockQueryBuilder();
      qbCalendar.getMany.mockResolvedValue([]);
      calendarEventsRepository.createQueryBuilder = jest.fn(() => qbCalendar);

      const qbFinance = mockQueryBuilder();
      qbFinance.getRawOne.mockResolvedValue({ total: '50000' });
      qbFinance.getRawMany.mockResolvedValue([]);
      financialEntriesRepository.createQueryBuilder = jest.fn(() => qbFinance);

      const qbNotifications = mockQueryBuilder();
      qbNotifications.getCount.mockResolvedValue(3);
      notificationsRepository.createQueryBuilder = jest.fn(
        () => qbNotifications,
      );

      const qbAnnouncements = mockQueryBuilder();
      qbAnnouncements.getMany.mockResolvedValue([]);
      qbAnnouncements.getCount.mockResolvedValue(0);
      announcementsRepository.createQueryBuilder = jest.fn(
        () => qbAnnouncements,
      );

      const result = await service.getOverview(
        userId,
        congregationId,
        permissions,
      );

      expect(result.kpis.activeMembers).toBe(50);
      expect(result.kpis.visitorsThisMonth).toBe(10);
      expect(result.kpis.pendingFollowUps).toBe(10);
      expect(result.kpis.upcomingEventsCount).toBe(0);
      expect(result.kpis.lastAttendanceTotal).toBe(120);
      expect(result.kpis.lastAttendanceDate).toBe('2026-07-20');
      expect(result.kpis.monthIncome).toBe('50000.00');
      expect(result.kpis.monthExpense).toBe('50000.00');
      expect(result.kpis.monthBalance).toBe('0.00');
      expect(result.kpis.unreadNotifications).toBe(3);
      expect(result.charts.membersByStatus).toHaveLength(1);
      expect(result.charts.attendanceByMonth).toHaveLength(6);
      expect(result.charts.financeByMonth).toHaveLength(6);
      expect(result.upcomingEvents).toEqual([]);
      expect(result.birthdaysThisWeek).toBeInstanceOf(Array);
      expect(result.recentAnnouncements).toEqual([]);
    });

    it('deve incluir alerta crítico quando há acompanhamentos atrasados', async () => {
      const userId = 'user-123';
      const congregationId = 'cong-123';
      const permissions = ['secretariat:read'];

      let qbVisitorsCalls = 0;
      visitorsRepository.createQueryBuilder = jest.fn(() => {
        const qb = mockQueryBuilder();
        if (qbVisitorsCalls === 0) {
          qb.getCount.mockResolvedValue(15);
        } else if (qbVisitorsCalls === 1) {
          qb.getCount.mockResolvedValue(15);
        } else {
          qb.getCount.mockResolvedValue(5);
        }
        qbVisitorsCalls++;
        return qb;
      });

      const qbCalendar = mockQueryBuilder();
      qbCalendar.getMany.mockResolvedValue([]);
      calendarEventsRepository.createQueryBuilder = jest.fn(() => qbCalendar);

      const qbAttendance = mockQueryBuilder();
      qbAttendance.getOne.mockResolvedValue(null);
      qbAttendance.getRawMany.mockResolvedValue([]);
      attendanceRepository.createQueryBuilder = jest.fn(() => qbAttendance);

      const qbMembers = mockQueryBuilder();
      qbMembers.getCount.mockResolvedValue(0);
      qbMembers.getMany.mockResolvedValue([]);
      membersRepository.createQueryBuilder = jest.fn(() => qbMembers);

      const qbNotifications = mockQueryBuilder();
      qbNotifications.getCount.mockResolvedValue(0);
      notificationsRepository.createQueryBuilder = jest.fn(
        () => qbNotifications,
      );

      const result = await service.getOverview(
        userId,
        congregationId,
        permissions,
      );

      expect(result.alerts.length).toBeGreaterThan(0);
      const criticalAlert = result.alerts.find(
        (alert) => alert.code === 'OVERDUE_FOLLOWUP',
      );
      expect(criticalAlert).toBeDefined();
      expect(criticalAlert?.severity).toBe('critical');
      expect(criticalAlert?.count).toBe(5);
    });
  });
});
