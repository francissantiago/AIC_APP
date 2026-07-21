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
import { IDashboardOverview } from '@interfaces/IDashboard';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DashboardService } from '@services/dashboard-service';
import { I18nService } from '@services/i18n-service';
import { ChartData } from 'chart.js';

@Component({
  selector: 'app-home-dashboard',
  imports: [ChartCanvas, DatePipe, RouterLink, TranslatePipe],
  templateUrl: './home-dashboard.html',
  styleUrl: './home-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeDashboard implements OnInit {
  readonly #dashboard = inject(DashboardService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #translate = inject(TranslateService);
  readonly #i18n = inject(I18nService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly overview = signal<IDashboardOverview | null>(null);

  readonly criticalAlerts = computed(() =>
    (this.overview()?.alerts ?? []).filter((a) => a.severity === 'critical'),
  );

  readonly warningAlerts = computed(() =>
    (this.overview()?.alerts ?? []).filter((a) => a.severity === 'warning'),
  );

  readonly infoAlerts = computed(() =>
    (this.overview()?.alerts ?? []).filter((a) => a.severity === 'info'),
  );

  readonly membersByStatusChartData = computed<ChartData<'doughnut'>>(() => {
    this.#i18n.currentLang();
    const data = this.overview()?.charts.membersByStatus ?? [];
    return {
      labels: data.map((item) => this.#memberStatusLabel(item.label)),
      datasets: [
        {
          data: data.map((item) => item.value),
          backgroundColor: ['#0369a1', '#059669', '#dc2626', '#d97706'],
        },
      ],
    };
  });

  readonly attendanceChartData = computed<ChartData<'bar'>>(() => {
    this.#i18n.currentLang();
    const data = this.overview()?.charts.attendanceByMonth ?? [];
    return {
      labels: data.map((item) => item.month),
      datasets: [
        {
          label: this.#translate.instant('DASHBOARD.CHART_ATTENDANCE'),
          data: data.map((item) => item.total),
          backgroundColor: '#0369a1',
        },
      ],
    };
  });

  readonly financeChartData = computed<ChartData<'bar'>>(() => {
    this.#i18n.currentLang();
    const data = this.overview()?.charts.financeByMonth ?? [];
    return {
      labels: data.map((item) => item.month),
      datasets: [
        {
          label: this.#translate.instant('DASHBOARD.KPI_INCOME'),
          data: data.map((item) => parseFloat(item.income)),
          backgroundColor: '#059669',
        },
        {
          label: this.#translate.instant('DASHBOARD.KPI_EXPENSE'),
          data: data.map((item) => parseFloat(item.expense)),
          backgroundColor: '#dc2626',
        },
      ],
    };
  });

  readonly membersSummary = computed(() => {
    this.#i18n.currentLang();
    const data = this.overview()?.charts.membersByStatus ?? [];
    return data.map((item) => `${this.#memberStatusLabel(item.label)}: ${item.value}`);
  });

  readonly attendanceSummary = computed(() => {
    const data = this.overview()?.charts.attendanceByMonth ?? [];
    return data.map((item) => `${item.month}: ${item.total}`);
  });

  readonly financeSummary = computed(() => {
    this.#i18n.currentLang();
    const data = this.overview()?.charts.financeByMonth ?? [];
    return data.map(
      (item) =>
        `${item.month}: ${this.#translate.instant('DASHBOARD.KPI_INCOME')} ${item.income}, ${this.#translate.instant('DASHBOARD.KPI_EXPENSE')} ${item.expense}`,
    );
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.#dashboard
      .overview()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (value) => {
          this.overview.set(value);
          this.loading.set(false);
        },
        error: () => {
          this.overview.set(null);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }

  alertSeverityClass(severity: 'critical' | 'warning' | 'info'): string {
    switch (severity) {
      case 'critical':
        return 'rounded-md border-l-4 border-red-500 bg-red-50 p-3';
      case 'warning':
        return 'rounded-md border-l-4 border-amber-500 bg-amber-50 p-3';
      case 'info':
        return 'rounded-md border-l-4 border-slate-400 bg-slate-50 p-3';
    }
  }

  alertTextClass(severity: 'critical' | 'warning' | 'info'): string {
    switch (severity) {
      case 'critical':
        return 'text-red-900';
      case 'warning':
        return 'text-amber-900';
      case 'info':
        return 'text-slate-900';
    }
  }

  isKnownRoute(href: string | null | undefined): boolean {
    if (!href) return false;
    const knownRoutes = [
      '/secretariat/visitors',
      '/secretariat/agenda',
      '/families/birthdays',
      '/announcements',
    ];
    return knownRoutes.some((route) => href.startsWith(route));
  }

  #memberStatusLabel(status: string): string {
    const key = `MEMBERS.STATUS_${status.toUpperCase()}`;
    const translated = this.#translate.instant(key);
    return translated === key ? status : translated;
  }
}
