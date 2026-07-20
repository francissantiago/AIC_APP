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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChartCanvas } from '@components/finance/chart-canvas/chart-canvas';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { IFinancialDashboard } from '@interfaces/IFinance';
import { FinanceService } from '@services/finance-service';
import { ChartData } from 'chart.js';

@Component({
  selector: 'app-financial-dashboard',
  imports: [ChartCanvas, ReactiveFormsModule, TranslatePipe],
  template: `
    <section class="w-full" data-testid="finance-dashboard">
      <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-xl font-semibold text-slate-900">{{ 'FINANCE.TITLE' | translate }}</h1>
          <p class="text-sm text-slate-600">{{ 'FINANCE.DASHBOARD_DESCRIPTION' | translate }}</p>
        </div>
        <form
          [formGroup]="filterForm"
          class="grid w-full min-w-0 gap-3 sm:w-auto sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          (ngSubmit)="load()"
          [attr.aria-label]="'COMMON.FILTER' | translate"
        >
          <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700">
            <span>{{ 'FINANCE.FROM' | translate }}</span>
            <input
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              type="date"
              formControlName="from"
              data-testid="finance-dashboard-from"
              [attr.aria-invalid]="periodInvalid()"
              [attr.aria-describedby]="periodInvalid() ? 'dashboard-period-error' : null"
            />
          </label>
          <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700">
            <span>{{ 'FINANCE.TO' | translate }}</span>
            <input
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              type="date"
              formControlName="to"
              data-testid="finance-dashboard-to"
              [attr.aria-invalid]="periodInvalid()"
              [attr.aria-describedby]="periodInvalid() ? 'dashboard-period-error' : null"
            />
          </label>
          <button
            class="self-end rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:opacity-50"
            type="submit"
            data-testid="finance-dashboard-filter"
          >
            {{ 'COMMON.FILTER' | translate }}
          </button>
          @if (periodInvalid()) {
            <p id="dashboard-period-error" class="text-sm text-red-700 sm:col-span-3" role="alert">
              {{ 'FINANCE.INVALID_PERIOD' | translate }}
            </p>
          }
        </form>
      </div>

      @if (loading()) {
        <p class="text-sm text-slate-600" role="status">{{ 'COMMON.LOADING' | translate }}</p>
      } @else if (error()) {
        <p role="alert" class="text-sm text-red-700">{{ 'FINANCE.LOAD_ERROR' | translate }}</p>
      } @else if (dashboard(); as value) {
        <div class="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" data-testid="finance-dashboard-cards">
          @for (card of cards(); track card.labelKey) {
            <article class="rounded-md border border-slate-200 p-4">
              <p class="text-sm text-slate-600">{{ card.labelKey | translate }}</p>
              <p class="mt-1 text-xl font-semibold text-slate-900">{{ card.value }}</p>
            </article>
          }
        </div>
        <div class="grid gap-5 xl:grid-cols-2">
          <app-chart-canvas
            type="bar"
            [data]="monthlyData()"
            [empty]="value.monthly.length === 0"
            [summary]="monthlySummary()"
            titleKey="FINANCE.MONTHLY_CHART"
            titleId="monthly-chart-title"
            summaryId="monthly-chart-summary"
            testId="finance-monthly-chart"
          />
          <app-chart-canvas
            type="doughnut"
            [data]="categoryData()"
            [empty]="value.expensesByCategory.length === 0"
            [summary]="categorySummary()"
            titleKey="FINANCE.CATEGORY_CHART"
            titleId="category-chart-title"
            summaryId="category-chart-summary"
            testId="finance-category-chart"
          />
        </div>
      } @else {
        <p class="text-sm text-slate-600">{{ 'COMMON.EMPTY' | translate }}</p>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialDashboard implements OnInit {
  readonly #finance = inject(FinanceService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #translate = inject(TranslateService);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly periodInvalid = signal(false);
  readonly dashboard = signal<IFinancialDashboard | null>(null);

  readonly filterForm = new FormGroup({
    from: new FormControl(this.#monthDate(1), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    to: new FormControl(this.#monthDate(new Date().getDate()), {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly cards = computed(() => {
    const totals = this.dashboard()?.totals;
    if (!totals) return [];
    return [
      { labelKey: 'FINANCE.INCOME', value: this.money(totals.income) },
      { labelKey: 'FINANCE.EXPENSE', value: this.money(totals.expense) },
      { labelKey: 'FINANCE.BALANCE', value: this.money(totals.balance) },
      { labelKey: 'FINANCE.ACTIVE_ASSETS', value: String(totals.activeAssets) },
      {
        labelKey: 'FINANCE.ESTIMATED_ASSET_VALUE',
        value: this.money(totals.estimatedAssetValue),
      },
    ];
  });

  readonly monthlyData = computed<ChartData<'bar'>>(() => {
    const rows = this.dashboard()?.monthly ?? [];
    return {
      labels: rows.map((row) => row.month),
      datasets: [
        {
          label: this.#translate.instant('FINANCE.INCOME'),
          data: rows.map((row) => Number(row.income)),
          backgroundColor: '#0369a1',
        },
        {
          label: this.#translate.instant('FINANCE.EXPENSE'),
          data: rows.map((row) => Number(row.expense)),
          backgroundColor: '#c2410c',
        },
      ],
    };
  });

  readonly categoryData = computed<ChartData<'doughnut'>>(() => {
    const rows = this.dashboard()?.expensesByCategory ?? [];
    return {
      labels: rows.map((row) => row.categoryName),
      datasets: [
        {
          data: rows.map((row) => Number(row.amount)),
          backgroundColor: [
            '#075985',
            '#9a3412',
            '#166534',
            '#6b21a8',
            '#a16207',
            '#be123c',
            '#334155',
            '#0f766e',
          ],
        },
      ],
    };
  });

  readonly monthlySummary = computed(() =>
    (this.dashboard()?.monthly ?? []).map(
      (row) =>
        `${row.month}: ${this.#translate.instant('FINANCE.INCOME')} ${this.money(row.income)}, ${this.#translate.instant('FINANCE.EXPENSE')} ${this.money(row.expense)}`,
    ),
  );
  readonly categorySummary = computed(() =>
    (this.dashboard()?.expensesByCategory ?? []).map(
      (row) => `${row.categoryName}: ${this.money(row.amount)}`,
    ),
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const period = this.filterForm.getRawValue();
    const invalid = this.filterForm.invalid || period.from > period.to;
    this.periodInvalid.set(invalid);
    if (invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(false);
    this.#finance
      .dashboard(period)
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

  money(value: string): string {
    return new Intl.NumberFormat(this.#translate.currentLang() || 'en', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value));
  }

  #monthDate(day: number): string {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), day, 12).toISOString().slice(0, 10);
  }
}
