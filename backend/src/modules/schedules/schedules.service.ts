import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, QueryFailedError, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { Member } from '../members/entities/member.entity';
import { MemberStatus } from '../members/enums/member-status.enum';
import { MinistryMember } from '../ministries/entities/ministry-member.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import { MinistryStatus } from '../ministries/enums/ministry-status.enum';
import { CalendarEvent } from '../secretariat/calendar/entities/calendar-event.entity';
import { BulkUpsertAssignmentsDto } from './dto/bulk-upsert-assignments.dto';
import { CreateScheduleAssignmentDto } from './dto/create-schedule-assignment.dto';
import { QueryScheduleMemberOptionsDto } from './dto/query-member-options.dto';
import { QueryScheduleAssignmentsDto } from './dto/query-schedule-assignments.dto';
import { QueryWeekViewDto } from './dto/query-week-view.dto';
import {
  PaginatedScheduleAssignmentsResponseDto,
  ScheduleAssignmentResponseDto,
  ScheduleMemberOptionDto,
} from './dto/schedule-assignment-response.dto';
import { UpdateScheduleAssignmentDto } from './dto/update-schedule-assignment.dto';
import { WeekViewResponseDto } from './dto/week-view-response.dto';
import { ScheduleAssignment } from './entities/schedule-assignment.entity';

const MAX_PERIOD_DAYS = 92;

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(ScheduleAssignment)
    private readonly assignmentsRepository: Repository<ScheduleAssignment>,
    @InjectRepository(CalendarEvent)
    private readonly eventsRepository: Repository<CalendarEvent>,
    @InjectRepository(Ministry)
    private readonly ministriesRepository: Repository<Ministry>,
    @InjectRepository(MinistryMember)
    private readonly ministryMembersRepository: Repository<MinistryMember>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    dto: CreateScheduleAssignmentDto,
  ): Promise<ScheduleAssignmentResponseDto> {
    const event = await this.getActiveEventOrFail(dto.calendarEventId);
    const ministry = await this.getMinistryForWriteOrFail(dto.ministryId);
    this.assertSameCongregation(event, ministry);
    await this.assertMemberEligible(
      dto.memberId,
      event.congregationId,
      ministry.id,
    );

    const assignment = this.assignmentsRepository.create({
      calendarEventId: event.id,
      ministryId: ministry.id,
      memberId: dto.memberId,
      roleLabel: dto.roleLabel.trim(),
      confirmed: dto.confirmed ?? false,
      notes: this.nullableText(dto.notes),
    });

    try {
      const saved = await this.assignmentsRepository.save(assignment);
      this.logger.log(`Atribuição de escala criada: ${saved.id}`);
      return this.toResponse(await this.getAssignmentOrFail(saved.id));
    } catch (error) {
      this.rethrowAssignmentConflict(error);
    }
  }

  async findAll(
    query: QueryScheduleAssignmentsDto,
  ): Promise<PaginatedScheduleAssignmentsResponseDto> {
    if (query.from && query.to) {
      this.validatePeriod(query.from, query.to);
    }

    const qb = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.calendarEvent', 'event')
      .innerJoinAndSelect('assignment.ministry', 'ministry')
      .innerJoinAndSelect('assignment.member', 'member')
      .where('event.deletedAt IS NULL')
      .orderBy('event.startsAt', 'ASC')
      .addOrderBy('ministry.name', 'ASC')
      .addOrderBy('member.fullName', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.from) {
      qb.andWhere('event.startsAt >= :from', {
        from: this.parsePeriodBound(query.from, 'start'),
      });
    }
    if (query.to) {
      qb.andWhere('event.startsAt <= :to', {
        to: this.parsePeriodBound(query.to, 'end'),
      });
    }
    if (query.calendarEventId) {
      qb.andWhere('assignment.calendarEventId = :calendarEventId', {
        calendarEventId: query.calendarEventId,
      });
    }
    if (query.ministryId) {
      qb.andWhere('assignment.ministryId = :ministryId', {
        ministryId: query.ministryId,
      });
    }
    if (query.memberId) {
      qb.andWhere('assignment.memberId = :memberId', {
        memberId: query.memberId,
      });
    }
    if (query.confirmed !== undefined) {
      qb.andWhere('assignment.confirmed = :confirmed', {
        confirmed: query.confirmed,
      });
    }

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => ScheduleAssignmentResponseDto.fromEntity(row)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findOne(id: string): Promise<ScheduleAssignmentResponseDto> {
    return this.toResponse(await this.getAssignmentOrFail(id));
  }

  async update(
    id: string,
    dto: UpdateScheduleAssignmentDto,
  ): Promise<ScheduleAssignmentResponseDto> {
    const assignment = await this.getAssignmentOrFail(id);
    const event = assignment.calendarEvent;

    let ministryId = assignment.ministryId;
    let memberId = assignment.memberId;

    if (dto.ministryId !== undefined) {
      const ministry = await this.getMinistryForWriteOrFail(dto.ministryId);
      this.assertSameCongregation(event, ministry);
      ministryId = ministry.id;
    }

    if (dto.memberId !== undefined) {
      memberId = dto.memberId;
    }

    if (dto.ministryId !== undefined || dto.memberId !== undefined) {
      await this.assertMemberEligible(
        memberId,
        event.congregationId,
        ministryId,
      );
    }

    if (dto.roleLabel !== undefined) {
      assignment.roleLabel = dto.roleLabel.trim();
    }
    if (dto.confirmed !== undefined) {
      assignment.confirmed = dto.confirmed;
    }
    if (dto.notes !== undefined) {
      assignment.notes = this.nullableText(dto.notes);
    }
    assignment.ministryId = ministryId;
    assignment.memberId = memberId;

    try {
      await this.assignmentsRepository.save(assignment);
      return this.toResponse(await this.getAssignmentOrFail(id));
    } catch (error) {
      this.rethrowAssignmentConflict(error);
    }
  }

  async remove(id: string): Promise<void> {
    const assignment = await this.getAssignmentOrFail(id);
    await this.assignmentsRepository.remove(assignment);
    this.logger.log(`Atribuição de escala removida: ${id}`);
  }

  async getWeekView(query: QueryWeekViewDto): Promise<WeekViewResponseDto> {
    this.validatePeriod(query.from, query.to);
    const from = this.parsePeriodBound(query.from, 'start');
    const to = this.parsePeriodBound(query.to, 'end');

    const events = await this.eventsRepository
      .createQueryBuilder('event')
      .where('event.deletedAt IS NULL')
      .andWhere('event.startsAt >= :from', { from })
      .andWhere('event.startsAt <= :to', { to })
      .orderBy('event.startsAt', 'ASC')
      .getMany();

    if (events.length === 0) {
      return { from: query.from, to: query.to, events: [] };
    }

    const eventIds = events.map((event) => event.id);
    const assignmentsQb = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.calendarEvent', 'event')
      .innerJoinAndSelect('assignment.ministry', 'ministry')
      .innerJoinAndSelect('assignment.member', 'member')
      .where('assignment.calendarEventId IN (:...eventIds)', { eventIds })
      .andWhere('event.deletedAt IS NULL')
      .orderBy('ministry.name', 'ASC')
      .addOrderBy('member.fullName', 'ASC');

    if (query.ministryId) {
      assignmentsQb.andWhere('assignment.ministryId = :ministryId', {
        ministryId: query.ministryId,
      });
    }
    if (query.unconfirmedOnly) {
      assignmentsQb.andWhere('assignment.confirmed = :confirmed', {
        confirmed: false,
      });
    }

    const assignments = await assignmentsQb.getMany();
    const byEvent = new Map<string, ScheduleAssignment[]>();
    for (const assignment of assignments) {
      const list = byEvent.get(assignment.calendarEventId) ?? [];
      list.push(assignment);
      byEvent.set(assignment.calendarEventId, list);
    }

    return {
      from: query.from,
      to: query.to,
      events: events.map((event) => {
        const eventAssignments = byEvent.get(event.id) ?? [];
        const ministryMap = new Map<
          string,
          {
            ministryId: string;
            ministryName: string;
            assignments: ScheduleAssignmentResponseDto[];
          }
        >();

        for (const assignment of eventAssignments) {
          const key = assignment.ministryId;
          const group = ministryMap.get(key) ?? {
            ministryId: assignment.ministry.id,
            ministryName: assignment.ministry.name,
            assignments: [],
          };
          group.assignments.push(
            ScheduleAssignmentResponseDto.fromEntity(assignment),
          );
          ministryMap.set(key, group);
        }

        return {
          id: event.id,
          title: event.title,
          type: event.type,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          ministries: [...ministryMap.values()],
        };
      }),
    };
  }

  async findByEvent(
    calendarEventId: string,
  ): Promise<ScheduleAssignmentResponseDto[]> {
    await this.getActiveEventOrFail(calendarEventId);
    const rows = await this.assignmentsRepository
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.calendarEvent', 'event')
      .innerJoinAndSelect('assignment.ministry', 'ministry')
      .innerJoinAndSelect('assignment.member', 'member')
      .where('assignment.calendarEventId = :calendarEventId', {
        calendarEventId,
      })
      .andWhere('event.deletedAt IS NULL')
      .orderBy('ministry.name', 'ASC')
      .addOrderBy('member.fullName', 'ASC')
      .getMany();

    return rows.map((row) => ScheduleAssignmentResponseDto.fromEntity(row));
  }

  async bulkUpsert(
    calendarEventId: string,
    ministryId: string,
    dto: BulkUpsertAssignmentsDto,
  ): Promise<ScheduleAssignmentResponseDto[]> {
    const event = await this.getActiveEventOrFail(calendarEventId);
    const ministry = await this.getMinistryForWriteOrFail(ministryId);
    this.assertSameCongregation(event, ministry);

    const memberIds = dto.items.map((item) => item.memberId);
    const uniqueMemberIds = new Set(memberIds);
    if (uniqueMemberIds.size !== memberIds.length) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.SCHEDULES_ASSIGNMENT_CONFLICT,
        message: ApiErrorMessage[ApiErrorCode.SCHEDULES_ASSIGNMENT_CONFLICT],
      });
    }

    for (const item of dto.items) {
      await this.assertMemberEligible(
        item.memberId,
        event.congregationId,
        ministry.id,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ScheduleAssignment);
      const existing = await repo.find({
        where: { calendarEventId, ministryId },
      });
      const incomingIds = new Set(dto.items.map((item) => item.memberId));
      const toRemove = existing.filter((row) => !incomingIds.has(row.memberId));
      if (toRemove.length > 0) {
        await repo.remove(toRemove);
      }

      for (const item of dto.items) {
        const current = existing.find((row) => row.memberId === item.memberId);
        if (current) {
          current.roleLabel = item.roleLabel.trim();
          current.confirmed = item.confirmed ?? current.confirmed;
          current.notes =
            item.notes !== undefined
              ? this.nullableText(item.notes)
              : current.notes;
          await repo.save(current);
        } else {
          const created = repo.create({
            calendarEventId,
            ministryId,
            memberId: item.memberId,
            roleLabel: item.roleLabel.trim(),
            confirmed: item.confirmed ?? false,
            notes: this.nullableText(item.notes),
          });
          await repo.save(created);
        }
      }
    });

    return this.findByEventAndMinistry(calendarEventId, ministryId);
  }

  async listMemberOptions(
    query: QueryScheduleMemberOptionsDto,
  ): Promise<ScheduleMemberOptionDto[]> {
    const ministry = await this.getMinistryOrFail(query.ministryId);

    const qb = this.ministryMembersRepository
      .createQueryBuilder('link')
      .innerJoinAndSelect('link.member', 'member')
      .where('link.ministryId = :ministryId', { ministryId: ministry.id })
      .andWhere('member.deletedAt IS NULL')
      .andWhere('member.status = :status', { status: MemberStatus.ACTIVE })
      .andWhere('member.congregationId = :congregationId', {
        congregationId: ministry.congregationId,
      })
      .orderBy('member.fullName', 'ASC')
      .take(query.limit);

    if (query.q) {
      qb.andWhere('member.fullName LIKE :q', { q: `%${query.q}%` });
    }

    const links = await qb.getMany();
    return links.map((link) => ({
      id: link.member.id,
      fullName: link.member.fullName,
      ministryRole: link.role,
    }));
  }

  private async findByEventAndMinistry(
    calendarEventId: string,
    ministryId: string,
  ): Promise<ScheduleAssignmentResponseDto[]> {
    const rows = await this.assignmentsRepository
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.calendarEvent', 'event')
      .innerJoinAndSelect('assignment.ministry', 'ministry')
      .innerJoinAndSelect('assignment.member', 'member')
      .where('assignment.calendarEventId = :calendarEventId', {
        calendarEventId,
      })
      .andWhere('assignment.ministryId = :ministryId', { ministryId })
      .andWhere('event.deletedAt IS NULL')
      .orderBy('member.fullName', 'ASC')
      .getMany();

    return rows.map((row) => ScheduleAssignmentResponseDto.fromEntity(row));
  }

  private async getAssignmentOrFail(id: string): Promise<ScheduleAssignment> {
    const assignment = await this.assignmentsRepository
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.calendarEvent', 'event')
      .innerJoinAndSelect('assignment.ministry', 'ministry')
      .innerJoinAndSelect('assignment.member', 'member')
      .where('assignment.id = :id', { id })
      .andWhere('event.deletedAt IS NULL')
      .getOne();

    if (!assignment) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SCHEDULES_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SCHEDULES_NOT_FOUND],
      });
    }
    return assignment;
  }

  private async getActiveEventOrFail(id: string): Promise<CalendarEvent> {
    const event = await this.eventsRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!event) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SCHEDULES_EVENT_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SCHEDULES_EVENT_NOT_FOUND],
      });
    }
    return event;
  }

  private async getMinistryOrFail(id: string): Promise<Ministry> {
    const ministry = await this.ministriesRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!ministry) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SCHEDULES_MINISTRY_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SCHEDULES_MINISTRY_NOT_FOUND],
      });
    }
    return ministry;
  }

  private async getMinistryForWriteOrFail(id: string): Promise<Ministry> {
    const ministry = await this.getMinistryOrFail(id);
    if (ministry.status !== MinistryStatus.ACTIVE) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SCHEDULES_MINISTRY_INACTIVE,
        message: ApiErrorMessage[ApiErrorCode.SCHEDULES_MINISTRY_INACTIVE],
      });
    }
    return ministry;
  }

  private async assertMemberEligible(
    memberId: string,
    congregationId: string,
    ministryId: string,
  ): Promise<void> {
    const member = await this.membersRepository.findOne({
      where: { id: memberId, deletedAt: IsNull() },
    });
    if (!member) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SCHEDULES_MEMBER_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SCHEDULES_MEMBER_NOT_FOUND],
      });
    }
    if (member.status !== MemberStatus.ACTIVE) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SCHEDULES_MEMBER_INACTIVE,
        message: ApiErrorMessage[ApiErrorCode.SCHEDULES_MEMBER_INACTIVE],
      });
    }
    if (member.congregationId !== congregationId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SCHEDULES_MEMBER_WRONG_CONGREGATION,
        message:
          ApiErrorMessage[ApiErrorCode.SCHEDULES_MEMBER_WRONG_CONGREGATION],
      });
    }

    const link = await this.ministryMembersRepository.findOne({
      where: { ministryId, memberId },
    });
    if (!link) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SCHEDULES_MEMBER_NOT_IN_MINISTRY,
        message: ApiErrorMessage[ApiErrorCode.SCHEDULES_MEMBER_NOT_IN_MINISTRY],
      });
    }
  }

  private assertSameCongregation(
    event: CalendarEvent,
    ministry: Ministry,
  ): void {
    if (event.congregationId !== ministry.congregationId) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SCHEDULES_CONGREGATION_MISMATCH,
        message: ApiErrorMessage[ApiErrorCode.SCHEDULES_CONGREGATION_MISMATCH],
      });
    }
  }

  private validatePeriod(from: string, to: string): void {
    const fromDate = this.parsePeriodBound(from, 'start');
    const toDate = this.parsePeriodBound(to, 'end');
    if (fromDate > toDate) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SCHEDULES_INVALID_PERIOD,
        message: ApiErrorMessage[ApiErrorCode.SCHEDULES_INVALID_PERIOD],
      });
    }
    const max = new Date(fromDate);
    max.setUTCDate(max.getUTCDate() + MAX_PERIOD_DAYS);
    if (toDate > max) {
      throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, {
        code: ApiErrorCode.SCHEDULES_INVALID_PERIOD,
        message: ApiErrorMessage[ApiErrorCode.SCHEDULES_INVALID_PERIOD],
      });
    }
  }

  private parsePeriodBound(value: string, bound: 'start' | 'end'): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(
        bound === 'start' ? `${value}T00:00:00.000Z` : `${value}T23:59:59.999Z`,
      );
    }
    return new Date(value);
  }

  private nullableText(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private toResponse(
    assignment: ScheduleAssignment,
  ): ScheduleAssignmentResponseDto {
    return ScheduleAssignmentResponseDto.fromEntity(assignment);
  }

  private isDuplicate(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === 'ER_DUP_ENTRY'
    );
  }

  private rethrowAssignmentConflict(error: unknown): never {
    if (this.isDuplicate(error)) {
      throw new ApiException(HttpStatus.CONFLICT, {
        code: ApiErrorCode.SCHEDULES_ASSIGNMENT_CONFLICT,
        message: ApiErrorMessage[ApiErrorCode.SCHEDULES_ASSIGNMENT_CONFLICT],
      });
    }
    throw error;
  }
}
