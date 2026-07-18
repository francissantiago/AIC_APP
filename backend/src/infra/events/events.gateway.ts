import { Logger } from '@nestjs/common';
import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:4200';

export type NotificationWsType = 'visitor_follow_up' | 'schedule_reminder';

export interface NotificationNewPayload {
  id: string;
  type: NotificationWsType;
  title: string;
  createdAt: string;
}

export const NOTIFICATION_NEW_EVENT = 'notification:new' as const;

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

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
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
}
