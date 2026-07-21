import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Socket } from 'socket.io';
import { UserStatus } from '../../modules/users/enums/user-status.enum';
import { UsersService } from '../../modules/users/users.service';
import {
  EventsGateway,
  NOTIFICATION_NEW_EVENT,
  NotificationNewPayload,
} from './events.gateway';

describe('EventsGateway', () => {
  let gateway: EventsGateway;

  const emit = jest.fn();
  const to = jest.fn().mockReturnValue({ emit });

  const jwtService = {
    verifyAsync: jest.fn(),
  };

  const usersService = {
    findOne: jest.fn(),
  };

  const userId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    gateway = module.get(EventsGateway);
    gateway.server = { to } as unknown as typeof gateway.server;
  });

  function createClient(overrides?: {
    authToken?: string;
    queryToken?: string | string[];
  }): {
    client: Socket;
    join: jest.Mock;
    disconnect: jest.Mock;
    data: { userId?: string };
  } {
    const join = jest.fn().mockResolvedValue(undefined);
    const disconnect = jest.fn();
    const data: { userId?: string } = {};
    const client = {
      id: 'socket-1',
      data,
      handshake: {
        auth: overrides?.authToken ? { token: overrides.authToken } : {},
        query: overrides?.queryToken ? { token: overrides.queryToken } : {},
      },
      join,
      disconnect,
    } as unknown as Socket;
    return { client, join, disconnect, data };
  }

  describe('handleConnection', () => {
    it('deve autenticar, validar user ativo e join em user:{id}', async () => {
      const { client, join, disconnect, data } = createClient({
        authToken: 'valid-jwt',
      });
      jwtService.verifyAsync.mockResolvedValue({
        sub: userId,
        email: 'a@b.com',
        username: 'user',
        roles: [],
      });
      usersService.findOne.mockResolvedValue({
        id: userId,
        status: UserStatus.ACTIVE,
      });

      await gateway.handleConnection(client);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-jwt');
      expect(usersService.findOne).toHaveBeenCalledWith(userId);
      expect(data.userId).toBe(userId);
      expect(join).toHaveBeenCalledWith(`user:${userId}`);
      expect(disconnect).not.toHaveBeenCalled();
    });

    it('deve aceitar token via query.token quando auth.token ausente', async () => {
      const { client, join } = createClient({ queryToken: 'query-jwt' });
      jwtService.verifyAsync.mockResolvedValue({
        sub: userId,
        email: 'a@b.com',
        username: 'user',
        roles: [],
      });
      usersService.findOne.mockResolvedValue({
        id: userId,
        status: UserStatus.ACTIVE,
      });

      await gateway.handleConnection(client);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('query-jwt');
      expect(join).toHaveBeenCalledWith(`user:${userId}`);
    });

    it('deve disconnect quando token ausente', async () => {
      const { client, join, disconnect } = createClient();

      await gateway.handleConnection(client);

      expect(disconnect).toHaveBeenCalledWith(true);
      expect(join).not.toHaveBeenCalled();
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('deve disconnect quando token inválido', async () => {
      const { client, join, disconnect } = createClient({
        authToken: 'bad-jwt',
      });
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await gateway.handleConnection(client);

      expect(disconnect).toHaveBeenCalledWith(true);
      expect(join).not.toHaveBeenCalled();
    });

    it('deve disconnect quando user não está active', async () => {
      const { client, join, disconnect } = createClient({
        authToken: 'valid-jwt',
      });
      jwtService.verifyAsync.mockResolvedValue({
        sub: userId,
        email: 'a@b.com',
        username: 'user',
        roles: [],
      });
      usersService.findOne.mockResolvedValue({
        id: userId,
        status: UserStatus.INACTIVE,
      });

      await gateway.handleConnection(client);

      expect(disconnect).toHaveBeenCalledWith(true);
      expect(join).not.toHaveBeenCalled();
    });
  });

  describe('emitNotificationNew', () => {
    it('deve emitir para room user:{userId} com payload tipado', () => {
      const payload: NotificationNewPayload = {
        id: '11111111-2222-3333-4444-555555555555',
        type: 'visitor_follow_up',
        title: 'Acompanhamento de visitante pendente',
        createdAt: '2026-07-18T12:00:00.000Z',
      };

      gateway.emitNotificationNew(userId, payload);

      expect(to).toHaveBeenCalledWith(`user:${userId}`);
      expect(emit).toHaveBeenCalledWith(NOTIFICATION_NEW_EVENT, payload);
    });
  });
});
