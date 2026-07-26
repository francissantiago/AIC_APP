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
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { INotification, NotificationType } from '@interfaces/INotification';
import { DateDisplayService } from '@services/date-display-service';
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
  readonly #dates = inject(DateDisplayService);
  readonly #router = inject(Router);
  readonly #translate = inject(TranslateService);
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
      case 'member_birthday':
        return 'NOTIFICATIONS.TYPE_MEMBER_BIRTHDAY';
      case 'construction_update':
        return 'NOTIFICATIONS.TYPES.CONSTRUCTION_UPDATE';
      case 'construction_status_change':
        return 'NOTIFICATIONS.TYPES.CONSTRUCTION_STATUS_CHANGE';
      case 'construction_budget_alert':
        return 'NOTIFICATIONS.TYPES.CONSTRUCTION_BUDGET_ALERT';
      case 'social_project_session_created':
        return 'NOTIFICATIONS.TYPES.SOCIAL_PROJECT_SESSION_CREATED';
      case 'social_project_status_change':
        return 'NOTIFICATIONS.TYPES.SOCIAL_PROJECT_STATUS_CHANGE';
      case 'social_project_budget_alert':
        return 'NOTIFICATIONS.TYPES.SOCIAL_PROJECT_BUDGET_ALERT';
      case 'social_project_participant_added':
        return 'NOTIFICATIONS.TYPES.SOCIAL_PROJECT_PARTICIPANT_ADDED';
      default: {
        const _exhaustive: never = type;
        return _exhaustive;
      }
    }
  }

  notificationTitle(notification: INotification): string {
    switch (notification.type) {
      case 'visitor_follow_up':
        return this.#translate.instant('NOTIFICATIONS.VISITOR_FOLLOW_UP_TITLE');
      case 'schedule_reminder':
        return this.#translate.instant('NOTIFICATIONS.SCHEDULE_REMINDER_TITLE');
      case 'member_birthday':
        return this.#translate.instant('NOTIFICATIONS.MEMBER_BIRTHDAY_TITLE');
      default:
        return notification.title;
    }
  }

  notificationBody(notification: INotification): string | null {
    switch (notification.type) {
      case 'visitor_follow_up': {
        const name = String(notification.payload?.['visitorFullName'] ?? '');
        const visitDateRaw = String(notification.payload?.['visitDate'] ?? '');
        const visitDate = visitDateRaw
          ? this.#dates.format(visitDateRaw, 'date')
          : visitDateRaw;
        return this.#translate.instant('NOTIFICATIONS.VISITOR_FOLLOW_UP_BODY', {
          name,
          visitDate,
        });
      }
      case 'schedule_reminder': {
        const eventTitle = String(notification.payload?.['eventTitle'] ?? '');
        const roleLabel = String(notification.payload?.['roleLabel'] ?? '');
        const memberFullName = String(notification.payload?.['memberFullName'] ?? '');
        const startsAtRaw = String(notification.payload?.['startsAt'] ?? '');
        if (!eventTitle || !startsAtRaw) {
          return notification.body
            ? this.#dates.formatIsoDatesInText(notification.body)
            : null;
        }
        const startsAt = this.#dates.format(startsAtRaw, 'datetimeShort');
        const isMemberRecipient = Boolean(notification.payload?.['isMemberRecipient']);
        if (isMemberRecipient) {
          return this.#translate.instant('NOTIFICATIONS.SCHEDULE_REMINDER_BODY_MEMBER', {
            roleLabel,
            eventTitle,
            startsAt,
          });
        }
        return this.#translate.instant('NOTIFICATIONS.SCHEDULE_REMINDER_BODY_SECRETARIAT', {
          memberFullName,
          roleLabel,
          eventTitle,
          startsAt,
        });
      }
      case 'member_birthday': {
        const name = String(
          notification.payload?.['memberFullName'] ?? notification.payload?.['memberId'] ?? '',
        );
        const birthDateRaw = String(notification.payload?.['birthDate'] ?? '');
        const birthDate = birthDateRaw
          ? this.#dates.format(birthDateRaw, 'date')
          : birthDateRaw;
        if (name && birthDate) {
          return this.#translate.instant('NOTIFICATIONS.MEMBER_BIRTHDAY_BODY', {
            name,
            birthDate,
          });
        }
        return notification.body
          ? this.#dates.formatIsoDatesInText(notification.body)
          : null;
      }
      default:
        break;
    }

    if (!notification.body) {
      return null;
    }
    return this.#dates.formatIsoDatesInText(notification.body);
  }

  formatCreatedAt(iso: string): string {
    return this.#dates.format(iso, 'datetimeShort');
  }

  #deepLinkFor(type: NotificationType): string | null {
    switch (type) {
      case 'visitor_follow_up':
        return '/secretariat/visitors';
      case 'schedule_reminder':
        return '/secretariat/schedules';
      case 'member_birthday':
        return '/families/birthdays';
      case 'construction_update':
      case 'construction_status_change':
      case 'construction_budget_alert':
        return '/constructions';
      case 'social_project_session_created':
        return '/social-projects/sessions';
      case 'social_project_status_change':
      case 'social_project_budget_alert':
      case 'social_project_participant_added':
        return '/social-projects';
      default:
        return null;
    }
  }
}
