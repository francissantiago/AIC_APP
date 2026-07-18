import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, QueryFailedError, Repository } from 'typeorm';
import {
  ApiErrorCode,
  ApiErrorMessage,
} from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { EventsGateway } from '../../infra/events/events.gateway';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { PaginatedNotificationsResponseDto } from './dto/paginated-notifications-response.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import {
  MarkAllReadResponseDto,
  UnreadCountResponseDto,
} from './dto/unread-count-response.dto';
import { Notification } from './entities/notification.entity';
import { NotificationReferenceType } from './enums/notification-reference-type.enum';
import { NotificationType } from './enums/notification-type.enum';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  referenceType: NotificationReferenceType;
  referenceId: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async createIfAbsent(
    input: CreateNotificationInput,
  ): Promise<Notification | null> {
    const entity = this.notificationsRepository.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      payload: input.payload,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      readAt: null,
    });

    try {
      const saved = await this.notificationsRepository.save(entity);
      this.eventsGateway.emitNotificationNew(saved.userId, {
        id: saved.id,
        type: saved.type,
        title: saved.title,
        createdAt: saved.createdAt.toISOString(),
      });
      return saved;
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        return null;
      }
      throw error;
    }
  }

  async findAllForUser(
    userId: string,
    query: QueryNotificationsDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.notificationsRepository
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId })
      .orderBy('n.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.unreadOnly) {
      qb.andWhere('n.read_at IS NULL');
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items.map((item) => NotificationResponseDto.fromEntity(item)),
      total,
      page,
      limit,
    };
  }

  async getUnreadCount(userId: string): Promise<UnreadCountResponseDto> {
    const count = await this.notificationsRepository.count({
      where: { userId, readAt: IsNull() },
    });
    return { count };
  }

  async markAsRead(
    id: string,
    userId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationsRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new ApiException(HttpStatus.NOT_FOUND, {
        code: ApiErrorCode.NOTIFICATIONS_NOT_FOUND,
        message: ApiErrorMessage[ApiErrorCode.NOTIFICATIONS_NOT_FOUND],
      });
    }

    if (notification.readAt === null) {
      notification.readAt = new Date();
      await this.notificationsRepository.save(notification);
      this.logger.log(`Notificação marcada como lida: ${id}`);
    }

    return NotificationResponseDto.fromEntity(notification);
  }

  async markAllAsRead(userId: string): Promise<MarkAllReadResponseDto> {
    const result = await this.notificationsRepository.update(
      { userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    const updated = result.affected ?? 0;
    this.logger.log(
      `Notificações marcadas como lidas (user=${userId}): ${updated}`,
    );
    return { updated };
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === 'ER_DUP_ENTRY'
    );
  }
}
