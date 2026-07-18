import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CongregationsService } from '../../congregations/congregations.service';
import { UserResponseDto } from '../../users/dto/user-response.dto';
import {
  CalendarEventResponseDto,
  CreateCalendarEventDto,
  PaginatedCalendarEventsResponseDto,
  QueryCalendarEventsDto,
  UpdateCalendarEventDto,
} from '../dto/secretariat.dto';
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
  ): Promise<CalendarEventResponseDto> {
    const congregationId = await this.getCongregationId();
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    this.validateRange(startsAt, endsAt);
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
    });
    const saved = await this.calendarEventsRepository.save(event);
    this.logger.log(`Evento de agenda criado: ${saved.id}`);
    return this.toDto(saved);
  }

  async findEvents(
    query: QueryCalendarEventsDto,
  ): Promise<PaginatedCalendarEventsResponseDto> {
    const congregationId = await this.getCongregationId();
    const qb = this.calendarEventsRepository
      .createQueryBuilder('event')
      .where('event.congregationId = :congregationId', { congregationId });
    if (query.from) {
      qb.andWhere('event.endsAt >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('event.startsAt <= :to', { to: query.to });
    }
    if (query.type) {
      qb.andWhere('event.type = :type', { type: query.type });
    }
    qb.orderBy('event.startsAt', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [events, total] = await qb.getManyAndCount();
    return {
      data: events.map(this.toDto),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findEvent(id: string): Promise<CalendarEventResponseDto> {
    const congregationId = await this.getCongregationId();
    return this.toDto(await this.getEventOrFail(id, congregationId));
  }

  async updateEvent(
    id: string,
    dto: UpdateCalendarEventDto,
  ): Promise<CalendarEventResponseDto> {
    const congregationId = await this.getCongregationId();
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
    const saved = await this.calendarEventsRepository.save(event);
    this.logger.log(`Evento de agenda atualizado: ${saved.id}`);
    return this.toDto(saved);
  }

  async removeEvent(id: string): Promise<void> {
    const congregationId = await this.getCongregationId();
    await this.calendarEventsRepository.softRemove(
      await this.getEventOrFail(id, congregationId),
    );
    this.logger.log(`Evento de agenda removido (soft delete): ${id}`);
  }

  private async getCongregationId(): Promise<string> {
    return (await this.congregationsService.getOrCreateBase()).id;
  }

  private async getEventOrFail(
    id: string,
    congregationId: string,
  ): Promise<CalendarEvent> {
    const event = await this.calendarEventsRepository.findOne({
      where: { id, congregationId },
    });
    if (!event) throw new NotFoundException(`Evento ${id} não encontrado`);
    return event;
  }

  private validateRange(startsAt: Date, endsAt: Date): void {
    if (endsAt.getTime() < startsAt.getTime()) {
      throw new BadRequestException(
        'ends_at deve ser posterior ou igual a starts_at',
      );
    }
  }

  private nullableText(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private readonly toDto = (
    event: CalendarEvent,
  ): CalendarEventResponseDto => ({
    id: event.id,
    congregationId: event.congregationId,
    createdByUserId: event.createdByUserId,
    title: event.title,
    type: event.type,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    allDay: Boolean(event.allDay),
    location: event.location,
    description: event.description,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  });
}
