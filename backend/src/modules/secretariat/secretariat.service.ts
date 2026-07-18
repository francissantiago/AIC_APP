import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CongregationsService } from '../congregations/congregations.service';
import { Member } from '../members/entities/member.entity';
import { AttendanceService } from './attendance/attendance.service';
import { AttendanceRecord } from './attendance/entities/attendance-record.entity';
import { CalendarEvent } from './calendar/entities/calendar-event.entity';
import {
  BirthdayDto,
  SecretariatDashboardResponseDto,
  UpcomingEventDto,
} from './dto/secretariat.dto';
import { SecretariatDocument } from './documents/entities/secretariat-document.entity';
import { Visitor } from './visitors/entities/visitor.entity';

const UPCOMING_EVENTS_LIMIT = 5;
const BIRTHDAY_WINDOW_DAYS = 7;
const MONTHLY_SERIES_MONTHS = 6;

type MonthlyTotalRow = { month: string; total: string };

@Injectable()
export class SecretariatService {
  private readonly logger = new Logger(SecretariatService.name);

  constructor(
    @InjectRepository(CalendarEvent)
    private readonly calendarEventsRepository: Repository<CalendarEvent>,
    @InjectRepository(Visitor)
    private readonly visitorsRepository: Repository<Visitor>,
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(SecretariatDocument)
    private readonly documentsRepository: Repository<SecretariatDocument>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    private readonly congregationsService: CongregationsService,
    private readonly attendanceService: AttendanceService,
  ) {}

  async getDashboard(): Promise<SecretariatDashboardResponseDto> {
    const congregationId = (await this.congregationsService.getOrCreateBase())
      .id;
    const now = new Date();
    const [
      upcomingEventsCount,
      upcomingEvents,
      visitorsThisMonth,
      pendingFollowUps,
      lastAttendance,
      birthdaysThisWeek,
      attendanceByMonth,
      visitorsByMonth,
    ] = await Promise.all([
      this.countUpcomingEvents(congregationId, now),
      this.findUpcomingEvents(congregationId, now),
      this.countVisitorsThisMonth(congregationId, now),
      this.countPendingFollowUps(congregationId),
      this.attendanceService.getLastRecord(congregationId),
      this.findBirthdaysThisWeek(congregationId, now),
      this.getAttendanceByMonth(congregationId, now),
      this.getVisitorsByMonth(congregationId, now),
    ]);

    return {
      upcomingEventsCount,
      upcomingEvents,
      visitorsThisMonth,
      pendingFollowUps,
      lastAttendanceTotal: lastAttendance?.totalPresent ?? null,
      lastAttendanceDate: lastAttendance?.eventDate ?? null,
      birthdaysThisWeek,
      attendanceByMonth,
      visitorsByMonth,
    };
  }

  private async countUpcomingEvents(
    congregationId: string,
    now: Date,
  ): Promise<number> {
    return this.calendarEventsRepository
      .createQueryBuilder('event')
      .where('event.congregationId = :congregationId', { congregationId })
      .andWhere('event.startsAt >= :now', { now })
      .getCount();
  }

  private async findUpcomingEvents(
    congregationId: string,
    now: Date,
  ): Promise<UpcomingEventDto[]> {
    const events = await this.calendarEventsRepository
      .createQueryBuilder('event')
      .where('event.congregationId = :congregationId', { congregationId })
      .andWhere('event.startsAt >= :now', { now })
      .orderBy('event.startsAt', 'ASC')
      .take(UPCOMING_EVENTS_LIMIT)
      .getMany();
    return events.map((event) => ({
      id: event.id,
      title: event.title,
      type: event.type,
      startsAt: event.startsAt,
      location: event.location,
    }));
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

  private async findBirthdaysThisWeek(
    congregationId: string,
    now: Date,
  ): Promise<BirthdayDto[]> {
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
      .getMany();
    return members.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      birthDate: member.birthDate as string,
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

  private async getVisitorsByMonth(
    congregationId: string,
    now: Date,
  ): Promise<{ month: string; total: number }[]> {
    const from = this.monthsAgo(now, MONTHLY_SERIES_MONTHS - 1);
    const rows = await this.visitorsRepository
      .createQueryBuilder('visitor')
      .select("DATE_FORMAT(visitor.visitDate, '%Y-%m')", 'month')
      .addSelect('COUNT(visitor.id)', 'total')
      .where('visitor.congregationId = :congregationId', { congregationId })
      .andWhere('visitor.visitDate >= :from', { from })
      .groupBy("DATE_FORMAT(visitor.visitDate, '%Y-%m')")
      .orderBy('month', 'ASC')
      .getRawMany<MonthlyTotalRow>();
    return this.fillMonthlySeries(rows, now);
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

  private monthsAgo(now: Date, months: number): string {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1),
    );
    return this.toIsoDate(date);
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
