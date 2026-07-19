import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CalendarEvent } from '../secretariat/calendar/entities/calendar-event.entity';
import {
  CalendarEventType,
  CalendarRecurrenceFrequency,
} from '../secretariat/enums/secretariat.enums';
import { Member } from './entities/member.entity';
import { MemberStatus } from './enums/member-status.enum';

const BIRTHDAY_DESCRIPTION =
  'Evento gerado automaticamente a partir do cadastro de membro.';

export interface MemberBirthdaySyncContext {
  actorUserId: string;
  congregationId: string;
}

@Injectable()
export class MemberBirthdayCalendarSyncService {
  private readonly logger = new Logger(MemberBirthdayCalendarSyncService.name);

  constructor(
    @InjectRepository(CalendarEvent)
    private readonly calendarEventsRepository: Repository<CalendarEvent>,
  ) {}

  async syncOnCreate(
    member: Member,
    ctx: MemberBirthdaySyncContext,
    manager?: EntityManager,
  ): Promise<void> {
    await this.syncMember(member, ctx, manager);
  }

  async syncOnUpdate(
    before: Member,
    after: Member,
    ctx: MemberBirthdaySyncContext,
  ): Promise<void> {
    void before;
    await this.syncMember(after, ctx);
  }

  async syncOnRemove(member: Member): Promise<void> {
    await this.removeBirthdayEvent(member);
  }

  private async syncMember(
    member: Member,
    ctx: MemberBirthdaySyncContext,
    manager?: EntityManager,
  ): Promise<void> {
    if (!this.shouldHaveBirthdayEvent(member)) {
      await this.removeBirthdayEvent(member, manager);
      return;
    }
    await this.upsertBirthdayEvent(member, ctx, manager);
  }

  private shouldHaveBirthdayEvent(member: Member): boolean {
    return (
      member.status === MemberStatus.ACTIVE &&
      member.birthDate != null &&
      member.deletedAt == null
    );
  }

  private async upsertBirthdayEvent(
    member: Member,
    ctx: MemberBirthdaySyncContext,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = this.getRepository(manager);
    const birthDate = member.birthDate as string;
    const startsAt = anchorBirthdayStartsAt(birthDate);
    const endsAt = anchorBirthdayEndsAt(birthDate);

    const existing = await repo.findOne({
      where: {
        congregationId: member.congregationId,
        sourceMemberId: member.id,
      },
      withDeleted: true,
    });

    if (existing) {
      existing.deletedAt = null;
      existing.createdByUserId = ctx.actorUserId;
      existing.title = buildBirthdayTitle(member.fullName);
      existing.type = CalendarEventType.BIRTHDAY;
      existing.startsAt = startsAt;
      existing.endsAt = endsAt;
      existing.allDay = true;
      existing.location = null;
      existing.description = BIRTHDAY_DESCRIPTION;
      existing.recurrenceFrequency = CalendarRecurrenceFrequency.YEARLY;
      existing.recurrenceInterval = 1;
      existing.recurrenceUntil = null;
      await repo.save(existing);
      this.logger.log(
        `Evento de aniversário sincronizado (update): member=${member.id}, event=${existing.id}`,
      );
      return;
    }

    const event = repo.create({
      congregationId: member.congregationId,
      createdByUserId: ctx.actorUserId,
      sourceMemberId: member.id,
      title: buildBirthdayTitle(member.fullName),
      type: CalendarEventType.BIRTHDAY,
      startsAt,
      endsAt,
      allDay: true,
      location: null,
      description: BIRTHDAY_DESCRIPTION,
      recurrenceFrequency: CalendarRecurrenceFrequency.YEARLY,
      recurrenceInterval: 1,
      recurrenceUntil: null,
    });
    const saved = await repo.save(event);
    this.logger.log(
      `Evento de aniversário sincronizado (create): member=${member.id}, event=${saved.id}`,
    );
  }

  private async removeBirthdayEvent(
    member: Member,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = this.getRepository(manager);
    const existing = await repo.findOne({
      where: {
        congregationId: member.congregationId,
        sourceMemberId: member.id,
      },
    });
    if (!existing) {
      return;
    }
    await repo.softRemove(existing);
    this.logger.log(
      `Evento de aniversário removido: member=${member.id}, event=${existing.id}`,
    );
  }

  private getRepository(manager?: EntityManager): Repository<CalendarEvent> {
    return manager
      ? manager.getRepository(CalendarEvent)
      : this.calendarEventsRepository;
  }
}

export function buildBirthdayTitle(fullName: string): string {
  return `Aniversário: ${fullName}`;
}

export function anchorBirthdayStartsAt(
  birthDate: string,
  referenceYear = new Date().getUTCFullYear(),
): Date {
  const [, month, day] = birthDate.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(referenceYear, month - 1, day, 0, 0, 0, 0));
}

export function anchorBirthdayEndsAt(
  birthDate: string,
  referenceYear = new Date().getUTCFullYear(),
): Date {
  const [, month, day] = birthDate.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(referenceYear, month - 1, day, 23, 59, 59, 999));
}
