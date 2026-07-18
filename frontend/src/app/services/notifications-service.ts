import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { IMarkAllRead } from '@interfaces/IMarkAllRead';
import { INotification } from '@interfaces/INotification';
import { INotificationNewEvent } from '@interfaces/INotificationNewEvent';
import { INotificationsPage } from '@interfaces/INotificationsPage';
import { IUnreadCount } from '@interfaces/IUnreadCount';
import { environment } from 'environments/environment';
import { Observable, retry, tap, timer } from 'rxjs';

export interface IQueryNotifications {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  readonly #http = inject(HttpClient);
  readonly #apiUrl = `${environment.apiUrl}/notifications`;
  readonly #retryCount = 3;
  readonly #retryDelay = 1000;

  readonly #headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  readonly unreadCount = signal(0);
  readonly items = signal<INotification[]>([]);
  readonly listLoading = signal(false);
  readonly listError = signal(false);
  readonly panelOpen = signal(false);

  list(query: IQueryNotifications = {}): Observable<INotificationsPage> {
    let params = new HttpParams();
    if (query.page != null) {
      params = params.set('page', String(query.page));
    }
    if (query.limit != null) {
      params = params.set('limit', String(query.limit));
    }
    if (query.unreadOnly != null) {
      params = params.set('unreadOnly', String(query.unreadOnly));
    }

    this.listLoading.set(true);
    this.listError.set(false);

    return this.#http
      .get<INotificationsPage>(this.#apiUrl, { headers: this.#headers, params })
      .pipe(
        this.#withRetry(),
        tap({
          next: (response) => {
            this.items.set(response.data);
            this.listLoading.set(false);
          },
          error: () => {
            this.items.set([]);
            this.listLoading.set(false);
            this.listError.set(true);
          },
        }),
      );
  }

  getUnreadCount(): Observable<IUnreadCount> {
    return this.#http
      .get<IUnreadCount>(`${this.#apiUrl}/unread-count`, { headers: this.#headers })
      .pipe(
        this.#withRetry(),
        tap({
          next: (response) => this.unreadCount.set(response.count),
        }),
      );
  }

  markAsRead(id: string): Observable<INotification> {
    return this.#http
      .patch<INotification>(`${this.#apiUrl}/${id}/read`, {}, { headers: this.#headers })
      .pipe(
        this.#withRetry(),
        tap({
          next: (updated) => {
            const previous = this.items().find((item) => item.id === updated.id);
            const wasUnread = previous ? previous.readAt === null : true;
            this.items.update((list) =>
              list.map((item) => (item.id === updated.id ? updated : item)),
            );
            if (wasUnread) {
              this.unreadCount.update((count) => Math.max(0, count - 1));
            }
          },
        }),
      );
  }

  markAllAsRead(): Observable<IMarkAllRead> {
    return this.#http
      .patch<IMarkAllRead>(`${this.#apiUrl}/read-all`, {}, { headers: this.#headers })
      .pipe(
        this.#withRetry(),
        tap({
          next: () => {
            const now = new Date().toISOString();
            this.items.update((list) =>
              list.map((item) => (item.readAt ? item : { ...item, readAt: now })),
            );
            this.unreadCount.set(0);
          },
        }),
      );
  }

  reconcile(options: { reloadList?: boolean } = {}): void {
    this.getUnreadCount().subscribe({ error: () => undefined });
    if (options.reloadList) {
      this.list({ page: 1, limit: 20 }).subscribe({ error: () => undefined });
    }
  }

  handleIncomingNotification(event: INotificationNewEvent): void {
    this.unreadCount.update((count) => count + 1);

    if (!this.panelOpen()) {
      return;
    }

    const exists = this.items().some((item) => item.id === event.id);
    if (exists) {
      return;
    }

    const stub: INotification = {
      id: event.id,
      type: event.type,
      title: event.title,
      body: '',
      payload: null,
      referenceType: event.type === 'visitor_follow_up' ? 'visitor' : 'schedule_assignment',
      referenceId: '',
      readAt: null,
      createdAt: event.createdAt,
    };
    this.items.update((list) => [stub, ...list]);
  }

  #withRetry<T>() {
    return retry<T>({
      count: this.#retryCount,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        if (error.status < 500) {
          throw error;
        }

        console.warn(
          `Error ${error.status} on attempt ${retryCount} of ${this.#retryCount}. Trying again in ${this.#retryDelay}ms...`,
        );
        return timer(this.#retryDelay);
      },
    });
  }
}
