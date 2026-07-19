import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../../common/errors/api-error.types';
import { ApiException } from '../../../common/errors/api.exception';
import { CongregationsService } from '../../congregations/congregations.service';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import {
  CalendarEventResponseDto,
  CreateCalendarEventDto,
  PaginatedCalendarEventsResponseDto,
  QueryCalendarEventsDto,
  UpdateCalendarEventDto,
} from '../dto/secretariat.dto';
import { CalendarRecurrenceFrequency } from '../enums/secretariat.enums';
import {
  expandCalendarEvent,
  ExpandedCalendarOccurrence,
} from './calendar-recurrence.util';
import { CalendarEvent } from './entities/calendar-event.entity';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @InjectRepository(CalendarEvent)
    private readonly calendarEventsRepository: Repository<CalendarEvent>,
    private readonly congregationsService: CongregationsService,
  ) {}

  async createEvent(
    dto: CreateCalendarEventDto,
    user: UserResponseDto,
    activeCongregationId?: string,
  ): Promise<CalendarEventResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    this.validateRange(startsAt, endsAt);
    const recurrence = this.normalizeRecurrence(dto, startsAt);
    const event = this.calendarEventsRepository.create({
      congregationId,
      createdByUserId: user.id,
      title: dto.title.trim(),
      type: dto.type,
      startsAt,
      endsAt,
      allDay: dto.allDay,
      location: this.nullableText(dto.location),
      description: this.nullableText(dto.description),
      ...recurrence,
    });
    const saved = await this.calendarEventsRepository.save(event);
    this.logger.log(`Evento de agenda criado: ${saved.id}`);
    return this.toMasterDto(saved);
  }

  async findEvents(
    query: QueryCalendarEventsDto,
    activeCongregationId?: string,
  ): Promise<PaginatedCalendarEventsResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const rangeFrom = query.from
      ? new Date(query.from)
      : new Date('1970-01-01T00:00:00.000Z');
    const rangeTo = query.to
      ? new Date(query.to)
      : new Date('2999-12-31T23:59:59.999Z');

    const qb = this.calendarEventsRepository
      .createQueryBuilder('event')
      .where('event.congregationId = :congregationId', { congregationId });

    qb.andWhere(
      new Brackets((nested) => {
        nested
          .where(
            `(event.recurrenceFrequency = :none
              AND event.endsAt >= :from
              AND event.startsAt <= :to)`,
            {
              none: CalendarRecurrenceFrequency.NONE,
              from: rangeFrom.toISOString(),
              to: rangeTo.toISOString(),
            },
          )
          .orWhere(
            `(event.recurrenceFrequency != :none
              AND event.startsAt <= :to
              AND (event.recurrenceUntil IS NULL OR event.recurrenceUntil >= :fromDate))`,
            {
              none: CalendarRecurrenceFrequency.NONE,
              to: rangeTo.toISOString(),
              fromDate: this.toIsoDate(rangeFrom),
            },
          );
      }),
    );

    if (query.type) {
      qb.andWhere('event.type = :type', { type: query.type });
    }

    const masters = await qb.orderBy('event.startsAt', 'ASC').getMany();
    const expanded = masters
      .flatMap((event) => expandCalendarEvent(event, rangeFrom, rangeTo))
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    const total = expanded.length;
    const start = (query.page - 1) * query.limit;
    const pageItems = expanded.slice(start, start + query.limit);

    return {
      data: pageItems.map((item) => this.toOccurrenceDto(item)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findEvent(
    id: string,
    activeCongregationId?: string,
  ): Promise<CalendarEventResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    return this.toMasterDto(await this.getEventOrFail(id, congregationId));
  }

  async updateEvent(
    id: string,
    dto: UpdateCalendarEventDto,
    activeCongregationId?: string,
  ): Promise<CalendarEventResponseDto> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const event = await this.getEventOrFail(id, congregationId);
    const nextStartsAt = dto.startsAt ? new Date(dto.startsAt) : event.startsAt;
    const nextEndsAt = dto.endsAt ? new Date(dto.endsAt) : event.endsAt;
    if (dto.startsAt !== undefined || dto.endsAt !== undefined) {
      this.validateRange(nextStartsAt, nextEndsAt);
      event.startsAt = nextStartsAt;
      event.endsAt = nextEndsAt;
    }
    if (dto.title !== undefined) event.title = dto.title.trim();
    if (dto.type !== undefined) event.type = dto.type;
    if (dto.allDay !== undefined) event.allDay = dto.allDay;
    if (dto.location !== undefined) {
      event.location = this.nullableText(dto.location);
    }
    if (dto.description !== undefined) {
      event.description = this.nullableText(dto.description);
    }
    if (
      dto.recurrenceFrequency !== undefined ||
      dto.recurrenceInterval !== undefined ||
      dto.recurrenceUntil !== undefined
    ) {
      const recurrence = this.normalizeRecurrence(
        {
          recurrenceFrequency:
            dto.recurrenceFrequency ?? event.recurrenceFrequency,
          recurrenceInterval:
            dto.recurrenceInterval ?? event.recurrenceInterval,
          recurrenceUntil:
            dto.recurrenceUntil === undefined
              ? event.recurrenceUntil
              : dto.recurrenceUntil,
        },
        event.startsAt,
      );
      event.recurrenceFrequency = recurrence.recurrenceFrequency;
      event.recurrenceInterval = recurrence.recurrenceInterval;
      event.recurrenceUntil = recurrence.recurrenceUntil;
    }
    const saved = await this.calendarEventsRepository.save(event);
    this.logger.log(`Evento de agenda atualizado: ${saved.id}`);
    return this.toMasterDto(saved);
  }

  async removeEvent(id: string, activeCongregationId?: string): Promise<void> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    await this.calendarEventsRepository.softRemove(
      await this.getEventOrFail(id, congregationId),
    );
    this.logger.log(`Evento de agenda removido (soft delete): ${id}`);
  }

  private async getCongregationId(
    activeCongregationId?: string,
  ): Promise<string> {
    if (activeCongregationId) {
      return activeCongregationId;
    }
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private async getEventOrFail(
    id: string,
    congregationId: string,
  ): Promise<CalendarEvent> {
    const event = await this.calendarEventsRepository.findOne({
      where: { id, congregationId },
    });
    if (!event) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.SECRETARIAT_EVENT_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.SECRETARIAT_EVENT_NOT_FOUND],
      });
    }
    return event;
  }

  private validateRange(startsAt: Date, endsAt: Date): void {
    if (endsAt.getTime() < startsAt.getTime()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.SECRETARIAT_EVENT_ENDS_BEFORE_START,
        message:
          ApiErrorMessage[ApiErrorCode.SECRETARIAT_EVENT_ENDS_BEFORE_START],
      });
    }
  }

  private normalizeRecurrence(
    dto: {
      recurrenceFrequency?: CalendarRecurrenceFrequency;
      recurrenceInterval?: number;
      recurrenceUntil?: string | null;
    },
    startsAt: Date,
  ): {
    recurrenceFrequency: CalendarRecurrenceFrequency;
    recurrenceInterval: number;
    recurrenceUntil: string | null;
  } {
    const frequency =
      dto.recurrenceFrequency ?? CalendarRecurrenceFrequency.NONE;
    if (frequency === CalendarRecurrenceFrequency.NONE) {
      return {
        recurrenceFrequency: CalendarRecurrenceFrequency.NONE,
        recurrenceInterval: 1,
        recurrenceUntil: null,
      };
    }

    const interval = Math.max(1, dto.recurrenceInterval ?? 1);
    const until = dto.recurrenceUntil?.trim() || null;
    if (until && until < this.toIsoDate(startsAt)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.SECRETARIAT_EVENT_RECURRENCE_UNTIL_INVALID,
        message:
          ApiErrorMessage[
            ApiErrorCode.SECRETARIAT_EVENT_RECURRENCE_UNTIL_INVALID
          ],
      });
    }
    return {
      recurrenceFrequency: frequency,
      recurrenceInterval: interval,
      recurrenceUntil: until,
    };
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private toIsoDate(value: Date): string {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toMasterDto(event: CalendarEvent): CalendarEventResponseDto {
    return this.toOccurrenceDto({
      seriesId: event.id,
      occurrenceId: event.id,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      event,
    });
  }

  private toOccurrenceDto(
    item: ExpandedCalendarOccurrence,
  ): CalendarEventResponseDto {
    const { event } = item;
    const frequency =
      event.recurrenceFrequency ?? CalendarRecurrenceFrequency.NONE;
    return {
      id: item.occurrenceId,
      seriesId: item.seriesId,
      congregationId: event.congregationId,
      createdByUserId: event.createdByUserId,
      title: event.title,
      type: event.type,
      startsAt: item.startsAt,
      endsAt: item.endsAt,
      allDay: Boolean(event.allDay),
      location: event.location,
      description: event.description,
      recurrenceFrequency: frequency,
      recurrenceInterval: event.recurrenceInterval ?? 1,
      recurrenceUntil: event.recurrenceUntil,
      isRecurring: frequency !== CalendarRecurrenceFrequency.NONE,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}
