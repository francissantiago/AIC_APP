import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Member } from '../members/entities/member.entity';
import { MemberStatus } from '../members/enums/member-status.enum';
import { Notification } from '../notifications/entities/notification.entity';
import { Announcement } from '../announcements/entities/announcement.entity';
import { Visitor } from '../secretariat/visitors/entities/visitor.entity';
import { AttendanceRecord } from '../secretariat/attendance/entities/attendance-record.entity';
import { CalendarEvent } from '../secretariat/calendar/entities/calendar-event.entity';
import { FinancialEntry } from '../finance/entities/financial-entry.entity';
import { FinancialType } from '../finance/enums/finance.enums';
import { CalendarRecurrenceFrequency } from '../secretariat/enums/secretariat.enums';
import {
  expandCalendarEvent,
  ExpandedCalendarOccurrence,
} from '../secretariat/calendar/calendar-recurrence.util';
import {
  DashboardOverviewResponseDto,
  DashboardAlertDto,
  DashboardKpisDto,
  DashboardChartsDto,
} from './dto/dashboard.dto';

const UPCOMING_EVENTS_LIMIT = 5;
const UPCOMING_WINDOW_DAYS = 60;
const BIRTHDAY_WINDOW_DAYS = 7;
const MONTHLY_SERIES_MONTHS = 6;
const MAX_ALERTS = 10;
const RECENT_ANNOUNCEMENTS_LIMIT = 5;
const RECENT_ANNOUNCEMENTS_HOURS = 48;
const BIRTHDAY_LIMIT = 8;

type MonthlyTotalRow = { month: string; total: string };
type MemberStatusRow = { status: string; count: string };
type FinanceMonthlyRow = { month: string; income: string; expense: string };

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    @InjectRepository(Visitor)
    private readonly visitorsRepository: Repository<Visitor>,
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(CalendarEvent)
    private readonly calendarEventsRepository: Repository<CalendarEvent>,
    @InjectRepository(FinancialEntry)
    private readonly financialEntriesRepository: Repository<FinancialEntry>,
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(Announcement)
    private readonly announcementsRepository: Repository<Announcement>,
  ) {}

  async getOverview(
    userId: string,
    activeCongregationId: string,
    permissions: string[],
  ): Promise<DashboardOverviewResponseDto> {
    const now = new Date();
    const hasMembers = permissions.includes('members:read');
    const hasSecretariat = permissions.includes('secretariat:read');
    const hasFinance = permissions.includes('finance:read');
    const hasAnnouncements = permissions.includes('announcements:read');

    const [
      activeMembers,
      visitorsThisMonth,
      pendingFollowUps,
      upcomingEventsCount,
      lastAttendance,
      monthIncome,
      monthExpense,
      unreadNotifications,
      membersByStatus,
      attendanceByMonth,
      financeByMonth,
      upcomingEvents,
      birthdaysThisWeek,
      recentAnnouncements,
    ] = await Promise.all([
      hasMembers
        ? this.countActiveMembers(activeCongregationId)
        : Promise.resolve(null),
      hasSecretariat
        ? this.countVisitorsThisMonth(activeCongregationId, now)
        : Promise.resolve(null),
      hasSecretariat
        ? this.countPendingFollowUps(activeCongregationId)
        : Promise.resolve(null),
      hasSecretariat
        ? this.countUpcomingEvents(activeCongregationId, now)
        : Promise.resolve(null),
      hasSecretariat
        ? this.getLastAttendance(activeCongregationId)
        : Promise.resolve(null),
      hasFinance
        ? this.getMonthIncome(activeCongregationId, now)
        : Promise.resolve(null),
      hasFinance
        ? this.getMonthExpense(activeCongregationId, now)
        : Promise.resolve(null),
      this.countUnreadNotifications(userId),
      hasMembers
        ? this.getMembersByStatus(activeCongregationId)
        : Promise.resolve(null),
      hasSecretariat
        ? this.getAttendanceByMonth(activeCongregationId, now)
        : Promise.resolve(null),
      hasFinance
        ? this.getFinanceByMonth(activeCongregationId, now)
        : Promise.resolve(null),
      hasSecretariat
        ? this.findUpcomingEvents(activeCongregationId, now)
        : Promise.resolve(null),
      hasSecretariat
        ? this.findBirthdaysThisWeek(activeCongregationId, now)
        : Promise.resolve(null),
      hasAnnouncements
        ? this.findRecentAnnouncements(activeCongregationId, now)
        : Promise.resolve(null),
    ]);

    const kpis: DashboardKpisDto = {
      activeMembers,
      visitorsThisMonth,
      pendingFollowUps,
      upcomingEventsCount,
      lastAttendanceTotal: lastAttendance?.totalPresent ?? null,
      lastAttendanceDate: lastAttendance?.eventDate ?? null,
      monthIncome:
        monthIncome !== null && monthExpense !== null
          ? this.money(monthIncome)
          : null,
      monthExpense:
        monthIncome !== null && monthExpense !== null
          ? this.money(monthExpense)
          : null,
      monthBalance:
        monthIncome !== null && monthExpense !== null
          ? this.money(monthIncome - monthExpense)
          : null,
      unreadNotifications,
    };

    const alerts = await this.computeAlerts(
      activeCongregationId,
      userId,
      now,
      permissions,
      {
        pendingFollowUps: pendingFollowUps ?? 0,
        unreadNotifications,
      },
    );

    const charts: DashboardChartsDto = {
      membersByStatus,
      attendanceByMonth,
      financeByMonth,
    };

    return {
      generatedAt: now.toISOString(),
      kpis,
      alerts,
      charts,
      upcomingEvents,
      birthdaysThisWeek,
      recentAnnouncements,
    };
  }

  private async countActiveMembers(congregationId: string): Promise<number> {
    return this.membersRepository
      .createQueryBuilder('member')
      .where('member.congregationId = :congregationId', { congregationId })
      .andWhere('member.status = :status', { status: MemberStatus.ACTIVE })
      .getCount();
  }

  private async countVisitorsThisMonth(
    congregationId: string,
    now: Date,
  ): Promise<number> {
    const from = this.toIsoDate(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    );
    const to = this.toIsoDate(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)),
    );
    return this.visitorsRepository
      .createQueryBuilder('visitor')
      .where('visitor.congregationId = :congregationId', { congregationId })
      .andWhere('visitor.visitDate BETWEEN :from AND :to', { from, to })
      .getCount();
  }

  private async countPendingFollowUps(congregationId: string): Promise<number> {
    return this.visitorsRepository
      .createQueryBuilder('visitor')
      .where('visitor.congregationId = :congregationId', { congregationId })
      .andWhere('visitor.followUpDone = :followUpDone', {
        followUpDone: false,
      })
      .getCount();
  }

  private async countUpcomingEvents(
    congregationId: string,
    now: Date,
  ): Promise<number> {
    return (await this.collectUpcomingOccurrences(congregationId, now)).length;
  }

  private async getLastAttendance(
    congregationId: string,
  ): Promise<{ totalPresent: number; eventDate: string } | null> {
    const record = await this.attendanceRepository
      .createQueryBuilder('record')
      .where('record.congregationId = :congregationId', { congregationId })
      .orderBy('record.eventDate', 'DESC')
      .addOrderBy('record.createdAt', 'DESC')
      .take(1)
      .getOne();
    return record
      ? { totalPresent: record.totalPresent, eventDate: record.eventDate }
      : null;
  }

  private async getMonthIncome(
    congregationId: string,
    now: Date,
  ): Promise<bigint> {
    const from = this.toIsoDate(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    );
    const to = this.toIsoDate(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)),
    );
    const result = await this.financialEntriesRepository
      .createQueryBuilder('entry')
      .select('SUM(entry.amount)', 'total')
      .where('entry.congregationId = :congregationId', { congregationId })
      .andWhere('entry.type = :type', { type: FinancialType.INCOME })
      .andWhere('entry.entryDate BETWEEN :from AND :to', { from, to })
      .getRawOne<{ total: string | null }>();
    return this.toCents(result?.total);
  }

  private async getMonthExpense(
    congregationId: string,
    now: Date,
  ): Promise<bigint> {
    const from = this.toIsoDate(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    );
    const to = this.toIsoDate(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)),
    );
    const result = await this.financialEntriesRepository
      .createQueryBuilder('entry')
      .select('SUM(entry.amount)', 'total')
      .where('entry.congregationId = :congregationId', { congregationId })
      .andWhere('entry.type = :type', { type: FinancialType.EXPENSE })
      .andWhere('entry.entryDate BETWEEN :from AND :to', { from, to })
      .getRawOne<{ total: string | null }>();
    return this.toCents(result?.total);
  }

  private async countUnreadNotifications(userId: string): Promise<number> {
    return this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.readAt IS NULL')
      .getCount();
  }

  private async getMembersByStatus(
    congregationId: string,
  ): Promise<{ label: string; value: number }[]> {
    const rows = await this.membersRepository
      .createQueryBuilder('member')
      .select('member.status', 'status')
      .addSelect('COUNT(member.id)', 'count')
      .where('member.congregationId = :congregationId', { congregationId })
      .groupBy('member.status')
      .getRawMany<MemberStatusRow>();
    return rows.map((row) => ({
      label: row.status,
      value: Number(row.count),
    }));
  }

  private async getAttendanceByMonth(
    congregationId: string,
    now: Date,
  ): Promise<{ month: string; total: number }[]> {
    const from = this.monthsAgo(now, MONTHLY_SERIES_MONTHS - 1);
    const rows = await this.attendanceRepository
      .createQueryBuilder('record')
      .select("DATE_FORMAT(record.eventDate, '%Y-%m')", 'month')
      .addSelect('SUM(record.totalPresent)', 'total')
      .where('record.congregationId = :congregationId', { congregationId })
      .andWhere('record.eventDate >= :from', { from })
      .groupBy("DATE_FORMAT(record.eventDate, '%Y-%m')")
      .orderBy('month', 'ASC')
      .getRawMany<MonthlyTotalRow>();
    return this.fillMonthlySeries(rows, now);
  }

  private async getFinanceByMonth(
    congregationId: string,
    now: Date,
  ): Promise<{ month: string; income: string; expense: string }[]> {
    const from = this.monthsAgo(now, MONTHLY_SERIES_MONTHS - 1);
    const rows = await this.financialEntriesRepository
      .createQueryBuilder('entry')
      .select("DATE_FORMAT(entry.entryDate, '%Y-%m')", 'month')
      .addSelect(
        "SUM(CASE WHEN entry.type = 'income' THEN entry.amount ELSE 0 END)",
        'income',
      )
      .addSelect(
        "SUM(CASE WHEN entry.type = 'expense' THEN entry.amount ELSE 0 END)",
        'expense',
      )
      .where('entry.congregationId = :congregationId', { congregationId })
      .andWhere('entry.entryDate >= :from', { from })
      .groupBy("DATE_FORMAT(entry.entryDate, '%Y-%m')")
      .orderBy('month', 'ASC')
      .getRawMany<FinanceMonthlyRow>();
    return this.fillFinanceMonthlySeries(rows, now);
  }

  private async findUpcomingEvents(congregationId: string, now: Date) {
    return (await this.collectUpcomingOccurrences(congregationId, now))
      .slice(0, UPCOMING_EVENTS_LIMIT)
      .map((item) => ({
        id: item.occurrenceId,
        title: item.event.title,
        type: item.event.type,
        startsAt: item.startsAt,
        location: item.event.location,
      }));
  }

  private async findBirthdaysThisWeek(congregationId: string, now: Date) {
    const monthDays: string[] = [];
    for (let offset = 0; offset < BIRTHDAY_WINDOW_DAYS; offset += 1) {
      const day = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + offset,
        ),
      );
      monthDays.push(this.toIsoDate(day).slice(5));
    }
    const members = await this.membersRepository
      .createQueryBuilder('member')
      .where('member.congregationId = :congregationId', { congregationId })
      .andWhere('member.birthDate IS NOT NULL')
      .andWhere("DATE_FORMAT(member.birthDate, '%m-%d') IN (:...monthDays)", {
        monthDays,
      })
      .orderBy("DATE_FORMAT(member.birthDate, '%m-%d')", 'ASC')
      .take(BIRTHDAY_LIMIT)
      .getMany();
    return members.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      birthDate: member.birthDate as string,
    }));
  }

  private async findRecentAnnouncements(congregationId: string, now: Date) {
    const cutoff = new Date(
      now.getTime() - RECENT_ANNOUNCEMENTS_HOURS * 3600000,
    );
    const announcements = await this.announcementsRepository
      .createQueryBuilder('announcement')
      .where('announcement.congregationId = :congregationId', {
        congregationId,
      })
      .andWhere('announcement.publishedAt >= :cutoff', { cutoff })
      .andWhere(
        new Brackets((nested) => {
          nested
            .where('announcement.expiresAt IS NULL')
            .orWhere('announcement.expiresAt > :now', { now });
        }),
      )
      .orderBy('announcement.publishedAt', 'DESC')
      .take(RECENT_ANNOUNCEMENTS_LIMIT)
      .getMany();
    return announcements.map((a) => ({
      id: a.id,
      title: a.title,
      publishedAt: a.publishedAt,
    }));
  }

  private async collectUpcomingOccurrences(
    congregationId: string,
    now: Date,
  ): Promise<ExpandedCalendarOccurrence[]> {
    const rangeTo = new Date(now.getTime());
    rangeTo.setUTCDate(rangeTo.getUTCDate() + UPCOMING_WINDOW_DAYS);

    const masters = await this.calendarEventsRepository
      .createQueryBuilder('event')
      .where('event.congregationId = :congregationId', { congregationId })
      .andWhere(
        new Brackets((nested) => {
          nested
            .where(
              `(event.recurrenceFrequency = :none
                AND event.startsAt >= :now
                AND event.startsAt <= :to)`,
              {
                none: CalendarRecurrenceFrequency.NONE,
                now,
                to: rangeTo,
              },
            )
            .orWhere(
              `(event.recurrenceFrequency != :none
                AND event.startsAt <= :to
                AND (event.recurrenceUntil IS NULL OR event.recurrenceUntil >= :fromDate))`,
              {
                none: CalendarRecurrenceFrequency.NONE,
                to: rangeTo,
                fromDate: this.toIsoDate(now),
              },
            );
        }),
      )
      .getMany();

    return masters
      .flatMap((event) => expandCalendarEvent(event, now, rangeTo))
      .filter((item) => item.startsAt.getTime() >= now.getTime())
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }

  private async computeAlerts(
    congregationId: string,
    userId: string,
    now: Date,
    permissions: string[],
    context: { pendingFollowUps: number; unreadNotifications: number },
  ): Promise<DashboardAlertDto[]> {
    const alerts: DashboardAlertDto[] = [];
    const hasSecretariat = permissions.includes('secretariat:read');
    const hasAnnouncements = permissions.includes('announcements:read');

    if (hasSecretariat) {
      const overdueFollowUps = await this.countOverdueFollowUps(
        congregationId,
        now,
      );
      if (overdueFollowUps > 0) {
        alerts.push({
          id: 'alert-overdue-followup',
          severity: 'critical',
          code: 'OVERDUE_FOLLOWUP',
          title: 'Acompanhamentos atrasados',
          message: `${overdueFollowUps} visitante(s) aguardam acompanhamento há mais de 7 dias.`,
          count: overdueFollowUps,
          href: '/secretariat/visitors',
          createdAt: now.toISOString(),
        });
      }

      const eventsToday = await this.countEventsToday(congregationId, now);
      if (eventsToday > 0) {
        alerts.push({
          id: 'alert-events-today',
          severity: 'warning',
          code: 'EVENTS_TODAY',
          title: 'Eventos hoje',
          message: `${eventsToday} evento(s) programado(s) para hoje.`,
          count: eventsToday,
          href: '/secretariat/agenda',
          createdAt: now.toISOString(),
        });
      }

      const recentFollowUps = context.pendingFollowUps - overdueFollowUps;
      if (recentFollowUps > 0) {
        alerts.push({
          id: 'alert-pending-followup',
          severity: 'warning',
          code: 'PENDING_FOLLOWUP',
          title: 'Acompanhamentos pendentes',
          message: `${recentFollowUps} visitante(s) aguardam acompanhamento.`,
          count: recentFollowUps,
          href: '/secretariat/visitors',
          createdAt: now.toISOString(),
        });
      }

      const upcomingBirthdays = await this.countUpcomingBirthdays(
        congregationId,
        now,
      );
      if (upcomingBirthdays > 0) {
        alerts.push({
          id: 'alert-birthdays',
          severity: 'info',
          code: 'UPCOMING_BIRTHDAYS',
          title: 'Aniversários próximos',
          message: `${upcomingBirthdays} aniversariante(s) nos próximos 7 dias.`,
          count: upcomingBirthdays,
          href: '/families/birthdays',
          createdAt: now.toISOString(),
        });
      }
    }

    if (hasAnnouncements) {
      const newAnnouncements = await this.countRecentAnnouncements(
        congregationId,
        now,
      );
      if (newAnnouncements > 0) {
        alerts.push({
          id: 'alert-new-announcements',
          severity: 'info',
          code: 'NEW_ANNOUNCEMENTS',
          title: 'Novos avisos',
          message: `${newAnnouncements} aviso(s) publicado(s) recentemente.`,
          count: newAnnouncements,
          href: '/announcements',
          createdAt: now.toISOString(),
        });
      }
    }

    if (context.unreadNotifications > 0) {
      alerts.push({
        id: 'alert-unread-notifications',
        severity: 'info',
        code: 'UNREAD_NOTIFICATIONS',
        title: 'Notificações não lidas',
        message: `Você tem ${context.unreadNotifications} notificação(ões) não lida(s).`,
        count: context.unreadNotifications,
        href: null,
        createdAt: now.toISOString(),
      });
    }

    alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return alerts.slice(0, MAX_ALERTS);
  }

  private async countOverdueFollowUps(
    congregationId: string,
    now: Date,
  ): Promise<number> {
    const cutoffDate = new Date(now.getTime());
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - 7);
    const cutoff = this.toIsoDate(cutoffDate);
    return this.visitorsRepository
      .createQueryBuilder('visitor')
      .where('visitor.congregationId = :congregationId', { congregationId })
      .andWhere('visitor.followUpDone = :followUpDone', {
        followUpDone: false,
      })
      .andWhere('visitor.visitDate <= :cutoff', { cutoff })
      .getCount();
  }

  private async countEventsToday(
    congregationId: string,
    now: Date,
  ): Promise<number> {
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const todayEnd = new Date(todayStart.getTime());
    todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
    const occurrences = await this.collectUpcomingOccurrences(
      congregationId,
      todayStart,
    );
    return occurrences.filter(
      (item) =>
        item.startsAt.getTime() >= todayStart.getTime() &&
        item.startsAt.getTime() < todayEnd.getTime(),
    ).length;
  }

  private async countUpcomingBirthdays(
    congregationId: string,
    now: Date,
  ): Promise<number> {
    const monthDays: string[] = [];
    for (let offset = 0; offset < BIRTHDAY_WINDOW_DAYS; offset += 1) {
      const day = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + offset,
        ),
      );
      monthDays.push(this.toIsoDate(day).slice(5));
    }
    return this.membersRepository
      .createQueryBuilder('member')
      .where('member.congregationId = :congregationId', { congregationId })
      .andWhere('member.birthDate IS NOT NULL')
      .andWhere("DATE_FORMAT(member.birthDate, '%m-%d') IN (:...monthDays)", {
        monthDays,
      })
      .getCount();
  }

  private async countRecentAnnouncements(
    congregationId: string,
    now: Date,
  ): Promise<number> {
    const cutoff = new Date(
      now.getTime() - RECENT_ANNOUNCEMENTS_HOURS * 3600000,
    );
    return this.announcementsRepository
      .createQueryBuilder('announcement')
      .where('announcement.congregationId = :congregationId', {
        congregationId,
      })
      .andWhere('announcement.publishedAt >= :cutoff', { cutoff })
      .andWhere(
        new Brackets((nested) => {
          nested
            .where('announcement.expiresAt IS NULL')
            .orWhere('announcement.expiresAt > :now', { now });
        }),
      )
      .getCount();
  }

  private fillMonthlySeries(
    rows: MonthlyTotalRow[],
    now: Date,
  ): { month: string; total: number }[] {
    const totalsByMonth = new Map(
      rows.map((row) => [row.month, Number(row.total)]),
    );
    const series: { month: string; total: number }[] = [];
    for (let offset = MONTHLY_SERIES_MONTHS - 1; offset >= 0; offset -= 1) {
      const reference = this.monthsAgo(now, offset);
      const month = reference.slice(0, 7);
      series.push({ month, total: totalsByMonth.get(month) ?? 0 });
    }
    return series;
  }

  private fillFinanceMonthlySeries(
    rows: FinanceMonthlyRow[],
    now: Date,
  ): { month: string; income: string; expense: string }[] {
    const dataByMonth = new Map(
      rows.map((row) => [
        row.month,
        { income: row.income, expense: row.expense },
      ]),
    );
    const series: { month: string; income: string; expense: string }[] = [];
    for (let offset = MONTHLY_SERIES_MONTHS - 1; offset >= 0; offset -= 1) {
      const reference = this.monthsAgo(now, offset);
      const month = reference.slice(0, 7);
      const data = dataByMonth.get(month);
      series.push({
        month,
        income: this.money(data?.income ?? '0'),
        expense: this.money(data?.expense ?? '0'),
      });
    }
    return series;
  }

  private monthsAgo(now: Date, months: number): string {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1),
    );
    return this.toIsoDate(date);
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private money(value: bigint | number | string | null | undefined): string {
    const cents = typeof value === 'bigint' ? value : this.toCents(value);
    const absolute = cents < 0n ? -cents : cents;
    const integer = absolute / 100n;
    const fraction = (absolute % 100n).toString().padStart(2, '0');
    return `${cents < 0n ? '-' : ''}${integer.toString()}.${fraction}`;
  }

  private subtractMoney(
    left: number | string | null | undefined,
    right: number | string | null | undefined,
  ): string {
    return this.money(this.toCents(left) - this.toCents(right));
  }

  private toCents(value: number | string | null | undefined): bigint {
    if (value == null) return 0n;
    const normalized =
      typeof value === 'number' ? value.toFixed(2) : value.trim();
    const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
    if (!match) {
      throw new Error(`Valor monetário inválido: ${normalized}`);
    }
    const fraction = (match[3] ?? '').padEnd(2, '0');
    const cents = BigInt(match[2]) * 100n + BigInt(fraction);
    return match[1] === '-' ? -cents : cents;
  }
}
