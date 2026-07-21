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
  ExportCalendarIcsQueryDto,
  ImportCalendarEventsResponseDto,
  PaginatedCalendarEventsResponseDto,
  QueryCalendarEventsDto,
  UpdateCalendarEventDto,
} from '../dto/secretariat.dto';
import { CalendarRecurrenceFrequency } from '../enums/secretariat.enums';
import {
  buildIcsCalendar,
  ICS_EXPORT_MAX_SERIES,
  ICS_IMPORT_MAX_BYTES,
  ICS_IMPORT_MAX_VEVENTS,
  IcsExportEvent,
  mapParsedVEventToCreateInput,
  parseIcsCalendar,
} from './calendar-ics.util';
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
    this.assertNotSystemManaged(event);
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
    const event = await this.getEventOrFail(id, congregationId);
    this.assertNotSystemManaged(event);
    await this.calendarEventsRepository.softRemove(event);
    this.logger.log(`Evento de agenda removido (soft delete): ${id}`);
  }

  async exportEventAsIcs(
    id: string,
    activeCongregationId?: string,
  ): Promise<string> {
    const congregationId = await this.getCongregationId(activeCongregationId);
    const [event, congregation] = await Promise.all([
      this.getEventOrFail(id, congregationId),
      this.congregationsService.getById(congregationId),
    ]);
    return buildIcsCalendar([this.toIcsExportEvent(event)], {
      congregationName: congregation.name,
    });
  }

  async exportRangeAsIcs(
    query: ExportCalendarIcsQueryDto,
    activeCongregationId?: string,
  ): Promise<string> {
    const rangeFrom = new Date(query.from);
    const rangeTo = new Date(query.to);
    if (
      Number.isNaN(rangeFrom.getTime()) ||
      Number.isNaN(rangeTo.getTime()) ||
      rangeFrom.getTime() >= rangeTo.getTime()
    ) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.SECRETARIAT_ICS_RANGE_INVALID,
        message: ApiErrorMessage[ApiErrorCode.SECRETARIAT_ICS_RANGE_INVALID],
      });
    }

    const congregationId = await this.getCongregationId(activeCongregationId);
    const [masters, congregation] = await Promise.all([
      this.findMasterEventsInRange(congregationId, rangeFrom, rangeTo),
      this.congregationsService.getById(congregationId),
    ]);

    const intersecting: CalendarEvent[] = [];
    for (const event of masters) {
      if (expandCalendarEvent(event, rangeFrom, rangeTo).length > 0) {
        intersecting.push(event);
      }
    }

    if (intersecting.length > ICS_EXPORT_MAX_SERIES) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.SECRETARIAT_ICS_EXPORT_LIMIT_EXCEEDED,
        message:
          ApiErrorMessage[ApiErrorCode.SECRETARIAT_ICS_EXPORT_LIMIT_EXCEEDED],
      });
    }

    return buildIcsCalendar(
      intersecting.map((e) => this.toIcsExportEvent(e)),
      { congregationName: congregation.name },
    );
  }

  async importFromIcs(
    raw: string,
    user: UserResponseDto,
    activeCongregationId?: string,
  ): Promise<ImportCalendarEventsResponseDto> {
    if (Buffer.byteLength(raw, 'utf8') > ICS_IMPORT_MAX_BYTES) {
      throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, {
        code: ApiErrorCode.SECRETARIAT_ICS_FILE_TOO_LARGE,
        message: ApiErrorMessage[ApiErrorCode.SECRETARIAT_ICS_FILE_TOO_LARGE],
      });
    }

    const parsed = parseIcsCalendar(raw);
    if (parsed.length === 0) {
      throw new ApiException(HttpStatus.BAD_REQUEST, {
        code: ApiErrorCode.SECRETARIAT_ICS_EMPTY_OR_INVALID,
        message: ApiErrorMessage[ApiErrorCode.SECRETARIAT_ICS_EMPTY_OR_INVALID],
      });
    }

    const response: ImportCalendarEventsResponseDto = {
      created: 0,
      skipped: [],
      warnings: [],
      createdIds: [],
    };

    const processable = parsed.slice(0, ICS_IMPORT_MAX_VEVENTS);
    for (const excess of parsed.slice(ICS_IMPORT_MAX_VEVENTS)) {
      response.skipped.push({
        uid: excess.uid,
        summary: excess.summary,
        reason: 'LIMIT_EXCEEDED',
        detail: `Máximo de ${ICS_IMPORT_MAX_VEVENTS} VEVENTs por importação`,
      });
    }

    for (const vevent of processable) {
      const mapped = mapParsedVEventToCreateInput(vevent);
      if (mapped.skip || !mapped.dto) {
        response.skipped.push(
          mapped.skip ?? {
            uid: vevent.uid,
            summary: vevent.summary,
            reason: 'VALIDATION_FAILED',
          },
        );
        continue;
      }
      if (mapped.warning) {
        response.warnings.push(mapped.warning);
      }
      try {
        const created = await this.createEvent(
          mapped.dto,
          user,
          activeCongregationId,
        );
        response.created += 1;
        response.createdIds.push(created.seriesId);
      } catch (error) {
        response.skipped.push({
          uid: vevent.uid,
          summary: mapped.dto.title,
          reason: 'CREATE_FAILED',
          detail: this.resolveErrorDetail(error),
        });
      }
    }

    return response;
  }

  private async findMasterEventsInRange(
    congregationId: string,
    rangeFrom: Date,
    rangeTo: Date,
  ): Promise<CalendarEvent[]> {
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

    return qb.orderBy('event.startsAt', 'ASC').getMany();
  }

  private toIcsExportEvent(event: CalendarEvent): IcsExportEvent {
    return {
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      allDay: Boolean(event.allDay),
      location: event.location,
      description: event.description,
      type: event.type,
      recurrenceFrequency: event.recurrenceFrequency,
      recurrenceInterval: event.recurrenceInterval,
      recurrenceUntil: event.recurrenceUntil,
    };
  }

  private resolveErrorDetail(error: unknown): string {
    if (error instanceof ApiException) {
      const payload = error.getResponse();
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'message' in payload
      ) {
        return String((payload as { message: string }).message);
      }
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'Falha ao criar evento';
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

  private assertNotSystemManaged(event: CalendarEvent): void {
    if (event.sourceMemberId) {
      throw new ApiException(HttpStatus.FORBIDDEN, {
        code: ApiErrorCode.SECRETARIAT_EVENT_SYSTEM_MANAGED,
        message: ApiErrorMessage[ApiErrorCode.SECRETARIAT_EVENT_SYSTEM_MANAGED],
      });
    }
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
      sourceMemberId: event.sourceMemberId,
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
