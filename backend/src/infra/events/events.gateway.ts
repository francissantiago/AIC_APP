import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../../modules/auth/dto/jwt-payload.dto';
import { UserStatus } from '../../modules/users/enums/user-status.enum';
import { UsersService } from '../../modules/users/users.service';

const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:4200';

export type NotificationWsType =
  'visitor_follow_up' | 'schedule_reminder' | 'member_birthday';

export interface NotificationNewPayload {
  id: string;
  type: NotificationWsType;
  title: string;
  createdAt: string;
}

export const NOTIFICATION_NEW_EVENT = 'notification:new' as const;

interface SocketUserData {
  userId?: string;
}

interface HandshakeAuth {
  token?: unknown;
}

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: corsOrigin.includes(',')
      ? corsOrigin.split(',').map((origin) => origin.trim())
      : corsOrigin,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`WS reject ${client.id}: missing token`);
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const user = await this.usersService.findOne(payload.sub);

      if (user.status !== UserStatus.ACTIVE) {
        this.logger.warn(`WS reject ${client.id}: user not active`);
        client.disconnect(true);
        return;
      }

      const data = client.data as SocketUserData;
      data.userId = user.id;
      await client.join(`user:${user.id}`);
      this.logger.log(`Client connected: ${client.id} room=user:${user.id}`);
    } catch {
      this.logger.warn(`WS reject ${client.id}: invalid token or user`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data?: unknown) {
    return {
      event: 'pong',
      data: data ?? { message: 'pong' },
      timestamp: new Date().toISOString(),
    };
  }

  emitNotificationNew(userId: string, payload: NotificationNewPayload): void {
    this.server.to(`user:${userId}`).emit(NOTIFICATION_NEW_EVENT, payload);
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as HandshakeAuth;
    const authToken = auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.length > 0) {
      return queryToken;
    }
    if (Array.isArray(queryToken) && typeof queryToken[0] === 'string') {
      return queryToken[0];
    }

    return null;
  }
}
