import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { INotification, NotificationType } from '@interfaces/INotification';
import { NotificationsService } from '@services/notifications-service';
import { NotificationsSocketService } from '@services/notifications-socket-service';

const PANEL_ID = 'notifications-panel';

@Component({
  selector: 'app-notifications-bell',
  imports: [TranslatePipe],
  templateUrl: './notifications-bell.html',
  styleUrl: './notifications-bell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsBell implements OnInit {
  readonly #notificationsService = inject(NotificationsService);
  readonly #socketService = inject(NotificationsSocketService);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);
  readonly #host = inject(ElementRef<HTMLElement>);

  readonly panelId = PANEL_ID;
  readonly unreadCount = this.#notificationsService.unreadCount;
  readonly items = this.#notificationsService.items;
  readonly listLoading = this.#notificationsService.listLoading;
  readonly listError = this.#notificationsService.listError;
  readonly panelOpen = this.#notificationsService.panelOpen;
  readonly connectionStatus = this.#socketService.connectionStatus;

  readonly badgeLabel = computed(() => {
    const count = this.unreadCount();
    if (count <= 0) {
      return null;
    }
    return count > 99 ? '99+' : String(count);
  });

  ngOnInit(): void {
    this.#notificationsService.getUnreadCount().subscribe({ error: () => undefined });

    const onDocumentClick = (event: MouseEvent) => {
      if (!this.panelOpen()) {
        return;
      }
      const target = event.target as Node | null;
      if (target && this.#host.nativeElement.contains(target)) {
        return;
      }
      this.closePanel();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.panelOpen()) {
        this.closePanel();
      }
    };

    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onKeyDown);
    this.#destroyRef.onDestroy(() => {
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onKeyDown);
    });
  }

  togglePanel(): void {
    if (this.panelOpen()) {
      this.closePanel();
      return;
    }
    this.openPanel();
  }

  openPanel(): void {
    this.#notificationsService.panelOpen.set(true);
    this.#notificationsService.list({ page: 1, limit: 20 }).subscribe({ error: () => undefined });
  }

  closePanel(): void {
    this.#notificationsService.panelOpen.set(false);
  }

  markAllAsRead(): void {
    this.#notificationsService.markAllAsRead().subscribe({ error: () => undefined });
  }

  onItemClick(notification: INotification): void {
    const navigate = () => {
      const route = this.#deepLinkFor(notification.type);
      this.closePanel();
      if (route) {
        void this.#router.navigateByUrl(route);
      }
    };

    if (notification.readAt) {
      navigate();
      return;
    }

    this.#notificationsService.markAsRead(notification.id).subscribe({
      next: () => navigate(),
      error: () => navigate(),
    });
  }

  typeLabelKey(type: NotificationType): string {
    switch (type) {
      case 'visitor_follow_up':
        return 'NOTIFICATIONS.TYPE_VISITOR_FOLLOW_UP';
      case 'schedule_reminder':
        return 'NOTIFICATIONS.TYPE_SCHEDULE_REMINDER';
      default:
        return 'NOTIFICATIONS.TYPE_GENERIC';
    }
  }

  formatCreatedAt(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return date.toLocaleString();
  }

  #deepLinkFor(type: NotificationType): string | null {
    switch (type) {
      case 'visitor_follow_up':
        return '/secretariat/visitors';
      case 'schedule_reminder':
        return '/secretariat/schedules';
      default:
        return null;
    }
  }
}
