import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { ApiErrorCode } from '../../common/errors/api-error.types';
import { ApiException } from '../../common/errors/api.exception';
import { EventsGateway } from '../../infra/events/events.gateway';
import { Notification } from './entities/notification.entity';
import { NotificationReferenceType } from './enums/notification-reference-type.enum';
import { NotificationType } from './enums/notification-type.enum';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const userId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const otherUserId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
  const notificationId = '11111111-2222-3333-4444-555555555555';
  const referenceId = '99999999-8888-7777-6666-555555555555';

  const notificationsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const eventsGateway = {
    emitNotificationNew: jest.fn(),
  };

  const baseNotification = (
    overrides?: Partial<Notification>,
  ): Notification => {
    const notification = new Notification();
    notification.id = notificationId;
    notification.userId = userId;
    notification.type = NotificationType.VISITOR_FOLLOW_UP;
    notification.title = 'Acompanhamento de visitante pendente';
    notification.body = 'Corpo';
    notification.payload = { visitorId: referenceId };
    notification.referenceType = NotificationReferenceType.VISITOR;
    notification.referenceId = referenceId;
    notification.readAt = null;
    notification.createdAt = new Date('2026-07-18T12:00:00.000Z');
    Object.assign(notification, overrides);
    return notification;
  };

  const mockListQueryBuilder = (
    items: Notification[],
    total = items.length,
  ) => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([items, total]),
    };
    notificationsRepository.createQueryBuilder.mockReturnValue(qb);
    return qb;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationsRepository,
        },
        { provide: EventsGateway, useValue: eventsGateway },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  describe('createIfAbsent', () => {
    it('deve criar e emitir WS uma vez', async () => {
      const saved = baseNotification();
      notificationsRepository.create.mockReturnValue(saved);
      notificationsRepository.save.mockResolvedValue(saved);

      const result = await service.createIfAbsent({
        userId,
        type: NotificationType.VISITOR_FOLLOW_UP,
        title: saved.title,
        body: saved.body,
        payload: saved.payload,
        referenceType: NotificationReferenceType.VISITOR,
        referenceId,
      });

      expect(result).toEqual(saved);
      expect(eventsGateway.emitNotificationNew).toHaveBeenCalledTimes(1);
      expect(eventsGateway.emitNotificationNew).toHaveBeenCalledWith(userId, {
        id: notificationId,
        type: NotificationType.VISITOR_FOLLOW_UP,
        title: saved.title,
        createdAt: '2026-07-18T12:00:00.000Z',
      });
    });

    it('deve retornar null e não emitir em duplicate key', async () => {
      const entity = baseNotification();
      notificationsRepository.create.mockReturnValue(entity);
      notificationsRepository.save.mockRejectedValue(
        new QueryFailedError('INSERT', [], {
          code: 'ER_DUP_ENTRY',
        } as unknown as Error),
      );

      const result = await service.createIfAbsent({
        userId,
        type: NotificationType.VISITOR_FOLLOW_UP,
        title: entity.title,
        body: entity.body,
        payload: entity.payload,
        referenceType: NotificationReferenceType.VISITOR,
        referenceId,
      });

      expect(result).toBeNull();
      expect(eventsGateway.emitNotificationNew).not.toHaveBeenCalled();
    });
  });

  describe('findAllForUser', () => {
    it('deve listar apenas do user com paginação', async () => {
      const items = [baseNotification()];
      const qb = mockListQueryBuilder(items, 1);

      const result = await service.findAllForUser(userId, {
        page: 1,
        limit: 20,
        unreadOnly: false,
      });

      expect(qb.where).toHaveBeenCalledWith('n.user_id = :userId', { userId });
      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe(notificationId);
      expect(result.data[0].readAt).toBeNull();
    });

    it('deve filtrar unreadOnly', async () => {
      const qb = mockListQueryBuilder([]);
      await service.findAllForUser(userId, {
        page: 1,
        limit: 20,
        unreadOnly: true,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('n.read_at IS NULL');
    });
  });

  describe('getUnreadCount', () => {
    it('deve retornar contagem', async () => {
      notificationsRepository.count.mockResolvedValue(3);
      await expect(service.getUnreadCount(userId)).resolves.toEqual({
        count: 3,
      });
    });
  });

  describe('markAsRead', () => {
    it('deve marcar como lida', async () => {
      const notification = baseNotification();
      notificationsRepository.findOne.mockResolvedValue(notification);
      notificationsRepository.save.mockImplementation((entity: Notification) =>
        Promise.resolve(entity),
      );

      const result = await service.markAsRead(notificationId, userId);

      expect(notificationsRepository.save).toHaveBeenCalled();
      expect(result.readAt).not.toBeNull();
    });

    it('deve ser idempotente se já lida', async () => {
      const readAt = new Date('2026-07-18T10:00:00.000Z');
      const notification = baseNotification({ readAt });
      notificationsRepository.findOne.mockResolvedValue(notification);

      const result = await service.markAsRead(notificationId, userId);

      expect(notificationsRepository.save).not.toHaveBeenCalled();
      expect(result.readAt).toBe(readAt.toISOString());
    });

    it('deve retornar 404 cross-user / inexistente', async () => {
      notificationsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.markAsRead(notificationId, otherUserId),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });

      try {
        await service.markAsRead(notificationId, otherUserId);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect((error as ApiException).getResponse()).toMatchObject({
          code: ApiErrorCode.NOTIFICATIONS_NOT_FOUND,
        });
      }
    });
  });

  describe('markAllAsRead', () => {
    it('deve atualizar unread e retornar updated', async () => {
      notificationsRepository.update.mockResolvedValue({ affected: 4 });
      await expect(service.markAllAsRead(userId)).resolves.toEqual({
        updated: 4,
      });
    });
  });
});
