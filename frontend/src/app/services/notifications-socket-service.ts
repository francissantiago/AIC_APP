import { effect, inject, Injectable, signal } from '@angular/core';
import { INotificationNewEvent } from '@interfaces/INotificationNewEvent';
import { AuthService } from '@services/auth-service';
import { NotificationsService } from '@services/notifications-service';
import { environment } from 'environments/environment';
import { io, Socket } from 'socket.io-client';

export type NotificationsSocketStatus = 'disconnected' | 'connecting' | 'connected';

const NOTIFICATION_NEW_EVENT = 'notification:new';

@Injectable({
  providedIn: 'root',
})
export class NotificationsSocketService {
  readonly #authService = inject(AuthService);
  readonly #notificationsService = inject(NotificationsService);

  readonly connectionStatus = signal<NotificationsSocketStatus>('disconnected');

  #socket: Socket | null = null;
  #activeToken: string | null = null;

  constructor() {
    effect(() => {
      const token = this.#authService.accessToken();
      if (token) {
        this.connect(token);
        return;
      }
      this.disconnect();
    });
  }

  connect(token: string): void {
    if (this.#socket?.connected && this.#activeToken === token) {
      return;
    }

    this.disconnect();
    this.#activeToken = token;
    this.connectionStatus.set('connecting');

    const origin = environment.wsUrl || undefined;
    this.#socket = io(`${origin ?? ''}/ws`, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    this.#socket.on('connect', () => {
      this.connectionStatus.set('connected');
      this.#reconcile();
    });

    this.#socket.io.on('reconnect', () => {
      this.connectionStatus.set('connected');
      this.#reconcile();
    });

    this.#socket.on('disconnect', () => {
      this.connectionStatus.set('disconnected');
    });

    this.#socket.on(NOTIFICATION_NEW_EVENT, (payload: INotificationNewEvent) => {
      this.#notificationsService.handleIncomingNotification(payload);
    });
  }

  disconnect(): void {
    if (this.#socket) {
      this.#socket.removeAllListeners();
      this.#socket.disconnect();
      this.#socket = null;
    }
    this.#activeToken = null;
    this.connectionStatus.set('disconnected');
  }

  #reconcile(): void {
    this.#notificationsService.reconcile({
      reloadList: this.#notificationsService.panelOpen(),
    });
  }
}
