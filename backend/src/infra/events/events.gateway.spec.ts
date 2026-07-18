import { Test, TestingModule } from '@nestjs/testing';
import {
  EventsGateway,
  NOTIFICATION_NEW_EVENT,
  NotificationNewPayload,
} from './events.gateway';

describe('EventsGateway', () => {
  let gateway: EventsGateway;

  const emit = jest.fn();
  const to = jest.fn().mockReturnValue({ emit });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [EventsGateway],
    }).compile();

    gateway = module.get(EventsGateway);
    gateway.server = { to } as unknown as typeof gateway.server;
  });

  describe('emitNotificationNew', () => {
    it('deve emitir para room user:{userId} com payload tipado', () => {
      const userId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      const payload: NotificationNewPayload = {
        id: '11111111-2222-3333-4444-555555555555',
        type: 'visitor_follow_up',
        title: 'Follow-up de visitante pendente',
        createdAt: '2026-07-18T12:00:00.000Z',
      };

      gateway.emitNotificationNew(userId, payload);

      expect(to).toHaveBeenCalledWith(`user:${userId}`);
      expect(emit).toHaveBeenCalledWith(NOTIFICATION_NEW_EVENT, payload);
    });
  });
});
