import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  GoogleCalendarConflictPolicy,
  GoogleCalendarSyncDirection,
  IGoogleCalendarConnectionStatus,
  IGoogleCalendarListItem,
} from '@interfaces/IGoogleCalendar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { GoogleCalendarService } from '@services/google-calendar-service';

type FeedbackTone = 'success' | 'error';

@Component({
  selector: 'app-google-calendar-panel',
  imports: [TranslatePipe, ReactiveFormsModule],
  templateUrl: './google-calendar-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleCalendarPanel implements OnInit {
  readonly eventsChanged = output<void>();

  readonly #gcal = inject(GoogleCalendarService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #translate = inject(TranslateService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  readonly gcalStatus = signal<IGoogleCalendarConnectionStatus | null>(null);
  readonly gcalBusy = signal(false);
  readonly gcalFeedback = signal<{ message: string; tone: FeedbackTone } | null>(null);
  readonly showSettings = signal(false);
  readonly showDisconnectConfirm = signal(false);
  readonly calendars = signal<IGoogleCalendarListItem[]>([]);

  readonly canWrite = computed(() => this.#auth.hasPermission('secretariat:write'));
  readonly connected = computed(() => Boolean(this.gcalStatus()?.connected));
  readonly hasError = computed(
    () =>
      this.gcalStatus()?.status === 'error' ||
      this.gcalStatus()?.status === 'revoked' ||
      Boolean(this.gcalStatus()?.lastSyncError),
  );

  readonly settingsForm = new FormGroup({
    googleCalendarId: new FormControl('primary', { nonNullable: true }),
    syncDirection: new FormControl<GoogleCalendarSyncDirection>('bidirectional', {
      nonNullable: true,
    }),
    conflictPolicy: new FormControl<GoogleCalendarConflictPolicy>('latest_wins', {
      nonNullable: true,
    }),
  });

  ngOnInit(): void {
    this.#handleOAuthQuery();
    this.loadStatus();
  }

  loadStatus(): void {
    this.gcalBusy.set(true);
    this.#gcal
      .getStatus()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (status) => {
          this.gcalStatus.set(status);
          this.settingsForm.patchValue({
            googleCalendarId: status.googleCalendarId ?? 'primary',
            syncDirection: status.syncDirection ?? 'bidirectional',
            conflictPolicy: status.conflictPolicy ?? 'latest_wins',
          });
          this.gcalBusy.set(false);
        },
        error: (err: unknown) => {
          this.gcalBusy.set(false);
          if (
            this.#apiError.resolve(err).code ===
            'SECRETARIAT.GOOGLE_CALENDAR_NOT_CONFIGURED'
          ) {
            this.gcalFeedback.set({
              message: this.#translate.instant(
                'SECRETARIAT.AGENDA.GOOGLE_CALENDAR.ERROR_NOT_CONFIGURED',
              ),
              tone: 'error',
            });
            return;
          }
          this.gcalStatus.set({
            connected: false,
            status: null,
            email: null,
            googleCalendarId: null,
            syncDirection: null,
            conflictPolicy: null,
            lastSyncAt: null,
            lastSyncError: null,
          });
        },
      });
  }

  connect(): void {
    if (!this.canWrite() || this.gcalBusy()) {
      return;
    }
    this.gcalBusy.set(true);
    this.#gcal
      .getOAuthUrl()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: ({ url }) => {
          window.location.assign(url);
        },
        error: (err: unknown) => {
          this.gcalBusy.set(false);
          this.gcalFeedback.set({
            message: this.#mapError(
              err,
              'SECRETARIAT.AGENDA.GOOGLE_CALENDAR.ERROR_OAUTH',
            ),
            tone: 'error',
          });
        },
      });
  }

  syncNow(): void {
    if (!this.canWrite() || this.gcalBusy()) {
      return;
    }
    this.gcalBusy.set(true);
    this.#gcal
      .syncNow()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (result) => {
          this.gcalBusy.set(false);
          this.gcalFeedback.set({
            message: this.#translate.instant(
              'SECRETARIAT.AGENDA.GOOGLE_CALENDAR.SUCCESS_SYNCED',
              { pushed: result.pushed, pulled: result.pulled },
            ),
            tone: 'success',
          });
          this.loadStatus();
          this.eventsChanged.emit();
        },
        error: (err: unknown) => {
          this.gcalBusy.set(false);
          this.gcalFeedback.set({
            message: this.#mapError(
              err,
              'SECRETARIAT.AGENDA.GOOGLE_CALENDAR.ERROR_SYNC',
            ),
            tone: 'error',
          });
        },
      });
  }

  openSettings(): void {
    if (!this.canWrite() || this.gcalBusy()) {
      return;
    }
    this.showSettings.set(true);
    this.#gcal
      .listCalendars()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.calendars.set(response.items),
        error: () => this.calendars.set([]),
      });
  }

  closeSettings(): void {
    this.showSettings.set(false);
  }

  saveSettings(): void {
    if (!this.canWrite() || this.gcalBusy()) {
      return;
    }
    this.gcalBusy.set(true);
    const value = this.settingsForm.getRawValue();
    this.#gcal
      .updateSettings(value)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (status) => {
          this.gcalStatus.set(status);
          this.gcalBusy.set(false);
          this.showSettings.set(false);
        },
        error: (err: unknown) => {
          this.gcalBusy.set(false);
          this.gcalFeedback.set({
            message: this.#mapError(
              err,
              'SECRETARIAT.AGENDA.GOOGLE_CALENDAR.ERROR_SYNC',
            ),
            tone: 'error',
          });
        },
      });
  }

  askDisconnect(): void {
    if (!this.canWrite() || this.gcalBusy()) {
      return;
    }
    this.showDisconnectConfirm.set(true);
  }

  cancelDisconnect(): void {
    this.showDisconnectConfirm.set(false);
  }

  confirmDisconnect(): void {
    if (!this.canWrite() || this.gcalBusy()) {
      return;
    }
    this.gcalBusy.set(true);
    this.showDisconnectConfirm.set(false);
    this.#gcal
      .disconnect()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.gcalBusy.set(false);
          this.gcalFeedback.set({
            message: this.#translate.instant(
              'SECRETARIAT.AGENDA.GOOGLE_CALENDAR.SUCCESS_DISCONNECTED',
            ),
            tone: 'success',
          });
          this.loadStatus();
        },
        error: (err: unknown) => {
          this.gcalBusy.set(false);
          this.gcalFeedback.set({
            message: this.#mapError(
              err,
              'SECRETARIAT.AGENDA.GOOGLE_CALENDAR.ERROR_SYNC',
            ),
            tone: 'error',
          });
        },
      });
  }

  formatLastSync(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    try {
      return new Date(iso).toLocaleString(this.#translate.currentLang() || 'en');
    } catch {
      return iso;
    }
  }

  #handleOAuthQuery(): void {
    const flag = this.#route.snapshot.queryParamMap.get('googleCalendar');
    if (!flag) {
      return;
    }
    if (flag === 'connected') {
      this.gcalFeedback.set({
        message: this.#translate.instant(
          'SECRETARIAT.AGENDA.GOOGLE_CALENDAR.SUCCESS_CONNECTED',
        ),
        tone: 'success',
      });
    } else if (flag === 'error') {
      this.gcalFeedback.set({
        message: this.#translate.instant('SECRETARIAT.AGENDA.GOOGLE_CALENDAR.ERROR_OAUTH'),
        tone: 'error',
      });
    }
    void this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: { googleCalendar: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  #mapError(err: unknown, fallbackKey: string): string {
    const resolved = this.#apiError.resolve(err);
    if (resolved.code === 'SECRETARIAT.GOOGLE_CALENDAR_NOT_CONFIGURED') {
      return this.#translate.instant(
        'SECRETARIAT.AGENDA.GOOGLE_CALENDAR.ERROR_NOT_CONFIGURED',
      );
    }
    if (resolved.statusCode === 403) {
      return this.#translate.instant(
        'SECRETARIAT.AGENDA.GOOGLE_CALENDAR.PERMISSION_DENIED',
      );
    }
    return this.#translate.instant(fallbackKey);
  }
}
