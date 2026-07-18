import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ChartCanvas } from '@components/finance/chart-canvas/chart-canvas';
import { ISecretariatDashboard } from '@interfaces/ISecretariat';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SecretariatService } from '@services/secretariat-service';
import { ChartData } from 'chart.js';

@Component({
  selector: 'app-secretariat-dashboard',
  imports: [ChartCanvas, DatePipe, RouterLink, TranslatePipe],
  template: `
    <section class="w-full">
      <div class="mb-5">
        <h1 class="text-xl font-semibold text-slate-900">
          {{ 'SECRETARIAT.TITLE' | translate }}
        </h1>
        <p class="text-sm text-slate-600">
          {{ 'SECRETARIAT.DASHBOARD_DESCRIPTION' | translate }}
        </p>
      </div>

      @if (loading()) {
        <p class="text-sm text-slate-600" role="status">{{ 'COMMON.LOADING' | translate }}</p>
      } @else if (error()) {
        <p role="alert" class="text-sm text-red-700">
          {{ 'SECRETARIAT.LOAD_ERROR' | translate }}
        </p>
      } @else if (dashboard(); as value) {
        <div class="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article class="rounded-md border border-slate-200 p-4">
            <p class="text-sm text-slate-600">{{ 'SECRETARIAT.CARD_UPCOMING' | translate }}</p>
            <p class="mt-1 text-xl font-semibold text-slate-900">{{ value.upcomingEventsCount }}</p>
          </article>
          <article class="rounded-md border border-slate-200 p-4">
            <p class="text-sm text-slate-600">
              {{ 'SECRETARIAT.CARD_VISITORS_MONTH' | translate }}
            </p>
            <p class="mt-1 text-xl font-semibold text-slate-900">{{ value.visitorsThisMonth }}</p>
          </article>
          <article class="rounded-md border border-slate-200 p-4">
            <p class="text-sm text-slate-600">
              {{ 'SECRETARIAT.CARD_PENDING_FOLLOWUPS' | translate }}
            </p>
            <p class="mt-1 text-xl font-semibold text-slate-900">{{ value.pendingFollowUps }}</p>
          </article>
          <article class="rounded-md border border-slate-200 p-4">
            <p class="text-sm text-slate-600">
              {{ 'SECRETARIAT.CARD_LAST_ATTENDANCE' | translate }}
            </p>
            <p class="mt-1 text-xl font-semibold text-slate-900">
              {{ value.lastAttendanceTotal ?? ('COMMON.NOT_AVAILABLE' | translate) }}
            </p>
            @if (value.lastAttendanceDate) {
              <p class="text-xs text-slate-500">{{ value.lastAttendanceDate }}</p>
            }
          </article>
        </div>

        <div class="mb-6 grid gap-5 xl:grid-cols-2">
          <app-chart-canvas
            type="bar"
            [data]="attendanceChartData()"
            [empty]="value.attendanceByMonth.length === 0"
            [summary]="attendanceSummary()"
            titleKey="SECRETARIAT.CHART_ATTENDANCE_MONTH"
            titleId="secretariat-attendance-chart-title"
            summaryId="secretariat-attendance-chart-summary"
          />
          <app-chart-canvas
            type="bar"
            [data]="visitorsChartData()"
            [empty]="value.visitorsByMonth.length === 0"
            [summary]="visitorsSummary()"
            titleKey="SECRETARIAT.CHART_VISITORS_MONTH"
            titleId="secretariat-visitors-chart-title"
            summaryId="secretariat-visitors-chart-summary"
          />
        </div>

        <div class="grid gap-5 xl:grid-cols-2">
          <section
            class="rounded-md border border-slate-200 p-4"
            aria-labelledby="upcoming-events-title"
          >
            <h2 id="upcoming-events-title" class="mb-3 font-semibold text-slate-900">
              {{ 'SECRETARIAT.UPCOMING_EVENTS' | translate }}
            </h2>
            @if (value.upcomingEvents.length === 0) {
              <p class="text-sm text-slate-600">{{ 'COMMON.EMPTY' | translate }}</p>
            } @else {
              <ul class="space-y-2 text-sm text-slate-700">
                @for (event of value.upcomingEvents; track event.id) {
                  <li
                    class="flex items-center justify-between gap-3 border-b border-slate-100 pb-2"
                  >
                    <span class="min-w-0 truncate font-medium text-slate-900">{{
                      event.title
                    }}</span>
                    <span class="shrink-0 text-slate-500">{{
                      event.startsAt | date: 'short'
                    }}</span>
                  </li>
                }
              </ul>
            }
            <a
              routerLink="/secretariat/agenda"
              class="mt-3 inline-block text-sm text-slate-900 underline underline-offset-2 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              {{ 'SECRETARIAT.AGENDA_TITLE' | translate }}
            </a>
          </section>
          <section class="rounded-md border border-slate-200 p-4" aria-labelledby="birthdays-title">
            <h2 id="birthdays-title" class="mb-3 font-semibold text-slate-900">
              {{ 'SECRETARIAT.BIRTHDAYS_THIS_WEEK' | translate }}
            </h2>
            @if (value.birthdaysThisWeek.length === 0) {
              <p class="text-sm text-slate-600">{{ 'COMMON.EMPTY' | translate }}</p>
            } @else {
              <ul class="space-y-2 text-sm text-slate-700">
                @for (birthday of value.birthdaysThisWeek; track birthday.id) {
                  <li
                    class="flex items-center justify-between gap-3 border-b border-slate-100 pb-2"
                  >
                    <span class="min-w-0 truncate font-medium text-slate-900">
                      {{ birthday.fullName }}
                    </span>
                    <span class="shrink-0 text-slate-500">{{
                      birthday.birthDate | date: 'MMM d'
                    }}</span>
                  </li>
                }
              </ul>
            }
          </section>
        </div>
      } @else {
        <p class="text-sm text-slate-600">{{ 'COMMON.EMPTY' | translate }}</p>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecretariatDashboard implements OnInit {
  readonly #secretariat = inject(SecretariatService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #translate = inject(TranslateService);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly dashboard = signal<ISecretariatDashboard | null>(null);

  readonly attendanceChartData = computed<ChartData<'bar'>>(() => {
    const rows = this.dashboard()?.attendanceByMonth ?? [];
    return {
      labels: rows.map((row) => row.month),
      datasets: [
        {
          label: this.#translate.instant('SECRETARIAT.CHART_ATTENDANCE_MONTH'),
          data: rows.map((row) => row.total),
          backgroundColor: '#0369a1',
        },
      ],
    };
  });

  readonly visitorsChartData = computed<ChartData<'bar'>>(() => {
    const rows = this.dashboard()?.visitorsByMonth ?? [];
    return {
      labels: rows.map((row) => row.month),
      datasets: [
        {
          label: this.#translate.instant('SECRETARIAT.CHART_VISITORS_MONTH'),
          data: rows.map((row) => row.total),
          backgroundColor: '#166534',
        },
      ],
    };
  });

  readonly attendanceSummary = computed(() =>
    (this.dashboard()?.attendanceByMonth ?? []).map((row) => `${row.month}: ${row.total}`),
  );

  readonly visitorsSummary = computed(() =>
    (this.dashboard()?.visitorsByMonth ?? []).map((row) => `${row.month}: ${row.total}`),
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.#secretariat
      .dashboard()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (value) => {
          this.dashboard.set(value);
          this.loading.set(false);
        },
        error: () => {
          this.dashboard.set(null);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
