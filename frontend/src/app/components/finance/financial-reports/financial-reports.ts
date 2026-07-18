import { DOCUMENT } from '@angular/common';
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
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  ASSET_STATUSES,
  ASSET_TYPES,
  AssetStatus,
  AssetType,
  FINANCIAL_TYPES,
  FinancialType,
} from '@enums/finance';
import { IAssetReport, ICashFlowReport, IFinancialCategory } from '@interfaces/IFinance';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FinanceService } from '@services/finance-service';

@Component({
  selector: 'app-financial-reports',
  imports: [ReactiveFormsModule, TranslatePipe],
  styles: `
    @media print {
      .no-print {
        display: none !important;
      }
      :host {
        color: #000;
      }
    }
  `,
  template: `
    <section class="w-full">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-xl font-semibold text-slate-900">{{ 'REPORTS.TITLE' | translate }}</h1>
        <button
          class="no-print rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          type="button"
          (click)="print()"
        >
          {{ 'REPORTS.PRINT' | translate }}
        </button>
      </div>
      <div
        class="no-print mb-5 flex gap-2"
        role="group"
        [attr.aria-label]="'REPORTS.TITLE' | translate"
      >
        <button
          type="button"
          [class]="
            'rounded-md border px-4 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ' +
            (tab() === 'cash'
              ? 'border-slate-500 bg-slate-500 font-medium text-white hover:bg-slate-600'
              : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50')
          "
          [attr.aria-pressed]="tab() === 'cash'"
          (click)="tab.set('cash')"
        >
          {{ 'REPORTS.CASH_FLOW' | translate }}
        </button>
        <button
          type="button"
          [class]="
            'rounded-md border px-4 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ' +
            (tab() === 'assets'
              ? 'border-slate-500 bg-slate-500 font-medium text-white hover:bg-slate-600'
              : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50')
          "
          [attr.aria-pressed]="tab() === 'assets'"
          (click)="tab.set('assets')"
        >
          {{ 'REPORTS.ASSET_INVENTORY' | translate }}
        </button>
      </div>
      @if (tab() === 'cash') {
        <form
          [formGroup]="cashForm"
          (ngSubmit)="applyCashFilters()"
          class="no-print mb-4 grid gap-3 md:grid-cols-4"
          [attr.aria-label]="'COMMON.FILTER' | translate"
        >
          <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700"
            ><span>{{ 'FINANCE.FROM' | translate }}</span
            ><input
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              type="date"
              formControlName="from"
          /></label>
          <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700"
            ><span>{{ 'FINANCE.TO' | translate }}</span
            ><input
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              type="date"
              formControlName="to"
          /></label>
          <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700"
            ><span>{{ 'FINANCE.TYPE' | translate }}</span
            ><select
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              formControlName="type"
            >
              <option value="">{{ 'COMMON.FILTER' | translate }}</option>
              @for (type of financialTypes; track type) {
                <option [value]="type">{{ financialTypeLabel(type) | translate }}</option>
              }
            </select></label
          >
          <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700"
            ><span>{{ 'FINANCE.CATEGORY' | translate }}</span
            ><select
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              formControlName="categoryId"
            >
              <option value="">{{ 'COMMON.FILTER' | translate }}</option>
              @for (category of categories(); track category.id) {
                <option [value]="category.id">{{ category.name }}</option>
              }
            </select></label
          >
          <div class="flex flex-wrap gap-3 md:col-span-4">
            <button
              class="rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:opacity-50"
              type="submit"
            >
              {{ 'COMMON.FILTER' | translate }}</button
            ><button
              class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
              type="button"
              [disabled]="exporting()"
              (click)="exportCsv()"
            >
              {{ 'REPORTS.EXPORT_CSV' | translate }}
            </button>
          </div>
        </form>
        @if (cash(); as report) {
          <div class="mb-4 grid gap-3 sm:grid-cols-3">
            <article class="rounded-md border border-slate-200 p-4">
              <span class="text-sm text-slate-600">{{ 'FINANCE.INCOME' | translate }}</span
              ><strong class="mt-1 block text-xl font-semibold text-slate-900">{{
                money(report.summary.income)
              }}</strong>
            </article>
            <article class="rounded-md border border-slate-200 p-4">
              <span class="text-sm text-slate-600">{{ 'FINANCE.EXPENSE' | translate }}</span
              ><strong class="mt-1 block text-xl font-semibold text-slate-900">{{
                money(report.summary.expense)
              }}</strong>
            </article>
            <article class="rounded-md border border-slate-200 p-4">
              <span class="text-sm text-slate-600">{{ 'FINANCE.BALANCE' | translate }}</span
              ><strong class="mt-1 block text-xl font-semibold text-slate-900">{{
                money(report.summary.balance)
              }}</strong>
            </article>
          </div>
          @if (report.data.length === 0) {
            <p class="text-sm text-slate-600">{{ 'REPORTS.EMPTY_CASH_FLOW' | translate }}</p>
          } @else {
            <div class="overflow-x-auto rounded-md border border-slate-200">
              <table class="min-w-full text-left text-sm">
                <caption class="sr-only">
                  {{
                    'REPORTS.CASH_FLOW' | translate
                  }}
                </caption>
                <thead class="bg-slate-50 text-slate-700">
                  <tr>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'FINANCE.ENTRY_DATE' | translate }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'FINANCE.DESCRIPTION' | translate }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'FINANCE.CATEGORY' | translate }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'FINANCE.AMOUNT' | translate }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (entry of report.data; track entry.id) {
                    <tr class="border-t border-slate-100">
                      <td class="px-3 py-2 text-slate-700">{{ entry.entryDate }}</td>
                      <td class="px-3 py-2 text-slate-900">{{ entry.description }}</td>
                      <td class="px-3 py-2 text-slate-700">{{ entry.category.name }}</td>
                      <td class="px-3 py-2 text-slate-900">{{ money(entry.amount) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div
              class="no-print mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700"
            >
              <span>
                {{ 'COMMON.PAGE' | translate }} {{ cashPage() }} / {{ cashTotalPages() }}
              </span>
              <div class="flex gap-2">
                <button
                  class="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
                  type="button"
                  [disabled]="cashPage() <= 1"
                  (click)="changeCashPage(-1)"
                >
                  {{ 'COMMON.PREVIOUS' | translate }}
                </button>
                <button
                  class="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
                  type="button"
                  [disabled]="cashPage() >= cashTotalPages()"
                  (click)="changeCashPage(1)"
                >
                  {{ 'COMMON.NEXT' | translate }}
                </button>
              </div>
            </div>
          }
        } @else if (!loading()) {
          <p class="text-sm text-slate-600">{{ 'COMMON.EMPTY' | translate }}</p>
        }
      } @else {
        <form
          [formGroup]="assetForm"
          (ngSubmit)="applyAssetFilters()"
          class="no-print mb-4 grid gap-3 md:grid-cols-3"
          [attr.aria-label]="'COMMON.FILTER' | translate"
        >
          <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700"
            ><span>{{ 'ASSETS.TYPE' | translate }}</span
            ><select
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              formControlName="type"
            >
              <option value="">{{ 'COMMON.FILTER' | translate }}</option>
              @for (type of assetTypes; track type) {
                <option [value]="type">{{ assetTypeLabel(type) | translate }}</option>
              }
            </select></label
          >
          <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700"
            ><span>{{ 'ASSETS.STATUS' | translate }}</span
            ><select
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              formControlName="status"
            >
              <option value="">{{ 'COMMON.FILTER' | translate }}</option>
              @for (status of assetStatuses; track status) {
                <option [value]="status">{{ assetStatusLabel(status) | translate }}</option>
              }
            </select></label
          >
          <button
            class="self-end rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:opacity-50"
            type="submit"
          >
            {{ 'COMMON.FILTER' | translate }}
          </button>
        </form>
        @if (assets(); as report) {
          <div class="mb-4 grid gap-3 sm:grid-cols-2">
            <article class="rounded-md border border-slate-200 p-4">
              <span class="text-sm text-slate-600">{{ 'REPORTS.QUANTITY' | translate }}</span
              ><strong class="mt-1 block text-xl font-semibold text-slate-900">{{
                report.quantity
              }}</strong>
            </article>
            <article class="rounded-md border border-slate-200 p-4">
              <span class="text-sm text-slate-600">{{
                'FINANCE.ESTIMATED_ASSET_VALUE' | translate
              }}</span
              ><strong class="mt-1 block text-xl font-semibold text-slate-900">{{
                money(report.estimatedValue)
              }}</strong>
            </article>
          </div>
          @if (report.data.length === 0) {
            <p class="text-sm text-slate-600">{{ 'REPORTS.EMPTY_ASSETS' | translate }}</p>
          } @else {
            <div class="overflow-x-auto rounded-md border border-slate-200">
              <table class="min-w-full text-left text-sm">
                <caption class="sr-only">
                  {{
                    'REPORTS.ASSET_INVENTORY' | translate
                  }}
                </caption>
                <thead class="bg-slate-50 text-slate-700">
                  <tr>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'ASSETS.TAG' | translate }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'ASSETS.NAME' | translate }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'ASSETS.TYPE' | translate }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'ASSETS.STATUS' | translate }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'ASSETS.CURRENT_VALUE' | translate }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (asset of report.data; track asset.id) {
                    <tr class="border-t border-slate-100">
                      <td class="px-3 py-2 text-slate-700">
                        {{ asset.assetTag || ('COMMON.NOT_AVAILABLE' | translate) }}
                      </td>
                      <td class="px-3 py-2 text-slate-900">{{ asset.name }}</td>
                      <td class="px-3 py-2 text-slate-700">
                        {{ assetTypeLabel(asset.type) | translate }}
                      </td>
                      <td class="px-3 py-2 text-slate-700">
                        {{ assetStatusLabel(asset.status) | translate }}
                      </td>
                      <td class="px-3 py-2 text-slate-900">
                        {{ money(asset.currentValue || asset.acquisitionValue || '0') }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div
              class="no-print mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700"
            >
              <span>
                {{ 'COMMON.PAGE' | translate }} {{ assetPage() }} / {{ assetTotalPages() }}
              </span>
              <div class="flex gap-2">
                <button
                  class="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
                  type="button"
                  [disabled]="assetPage() <= 1"
                  (click)="changeAssetPage(-1)"
                >
                  {{ 'COMMON.PREVIOUS' | translate }}
                </button>
                <button
                  class="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
                  type="button"
                  [disabled]="assetPage() >= assetTotalPages()"
                  (click)="changeAssetPage(1)"
                >
                  {{ 'COMMON.NEXT' | translate }}
                </button>
              </div>
            </div>
          }
        } @else if (!loading()) {
          <p class="text-sm text-slate-600">{{ 'COMMON.EMPTY' | translate }}</p>
        }
      }
      @if (loading()) {
        <p class="text-sm text-slate-600" role="status">{{ 'COMMON.LOADING' | translate }}</p>
      }
      @if (error()) {
        <p role="alert" class="text-sm text-red-700">{{ 'REPORTS.LOAD_ERROR' | translate }}</p>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialReports implements OnInit {
  readonly #finance = inject(FinanceService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #translate = inject(TranslateService);
  readonly #document = inject(DOCUMENT);
  readonly tab = signal<'cash' | 'assets'>('cash');
  readonly categories = signal<IFinancialCategory[]>([]);
  readonly cash = signal<ICashFlowReport | null>(null);
  readonly assets = signal<IAssetReport | null>(null);
  readonly cashPage = signal(1);
  readonly assetPage = signal(1);
  readonly cashLoading = signal(false);
  readonly assetLoading = signal(false);
  readonly exporting = signal(false);
  readonly loading = computed(() => this.cashLoading() || this.assetLoading() || this.exporting());
  readonly error = signal(false);
  readonly cashTotalPages = computed(() => Math.max(1, Math.ceil((this.cash()?.total ?? 0) / 20)));
  readonly assetTotalPages = computed(() =>
    Math.max(1, Math.ceil((this.assets()?.total ?? 0) / 20)),
  );
  readonly financialTypes = FINANCIAL_TYPES;
  readonly assetTypes = ASSET_TYPES;
  readonly assetStatuses = ASSET_STATUSES;
  readonly cashForm = new FormGroup({
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
    type: new FormControl<FinancialType | ''>('', { nonNullable: true }),
    categoryId: new FormControl('', { nonNullable: true }),
  });
  readonly assetForm = new FormGroup({
    type: new FormControl<AssetType | ''>('', { nonNullable: true }),
    status: new FormControl<AssetStatus | ''>('', { nonNullable: true }),
  });
  ngOnInit(): void {
    this.#finance
      .categories()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((v) => this.categories.set(v));
    this.loadCash();
    this.loadAssets();
  }
  applyCashFilters(): void {
    this.cashPage.set(1);
    this.loadCash();
  }
  applyAssetFilters(): void {
    this.assetPage.set(1);
    this.loadAssets();
  }
  changeCashPage(delta: number): void {
    this.cashPage.update((page) => page + delta);
    this.loadCash();
  }
  changeAssetPage(delta: number): void {
    this.assetPage.update((page) => page + delta);
    this.loadAssets();
  }
  loadCash(): void {
    this.cashLoading.set(true);
    this.error.set(false);
    const v = this.cashForm.getRawValue();
    this.#finance
      .cashFlowReport({
        page: this.cashPage(),
        limit: 20,
        from: v.from || undefined,
        to: v.to || undefined,
        type: v.type || undefined,
        categoryId: v.categoryId || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (r) => {
          this.cash.set(r);
          this.cashPage.set(r.page);
          this.cashLoading.set(false);
        },
        error: () => {
          this.cash.set(null);
          this.cashLoading.set(false);
          this.error.set(true);
        },
      });
  }
  loadAssets(): void {
    this.assetLoading.set(true);
    this.error.set(false);
    const v = this.assetForm.getRawValue();
    this.#finance
      .assetReport({
        page: this.assetPage(),
        limit: 20,
        type: v.type || undefined,
        status: v.status || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (r) => {
          this.assets.set(r);
          this.assetPage.set(r.page);
          this.assetLoading.set(false);
        },
        error: () => {
          this.assets.set(null);
          this.assetLoading.set(false);
          this.error.set(true);
        },
      });
  }
  exportCsv(): void {
    this.exporting.set(true);
    this.error.set(false);
    const v = this.cashForm.getRawValue();
    this.#finance
      .cashFlowCsv({
        from: v.from || undefined,
        to: v.to || undefined,
        type: v.type || undefined,
        categoryId: v.categoryId || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const anchor = this.#document.createElement('a');
          anchor.href = url;
          anchor.download = 'cash-flow.csv';
          anchor.click();
          URL.revokeObjectURL(url);
          this.exporting.set(false);
        },
        error: () => {
          this.exporting.set(false);
          this.error.set(true);
        },
      });
  }
  print(): void {
    this.#document.defaultView?.print();
  }
  financialTypeLabel(type: FinancialType): string {
    return type === FinancialType.INCOME ? 'FINANCE.INCOME' : 'FINANCE.EXPENSE';
  }
  assetTypeLabel(type: AssetType): string {
    return `ASSETS.TYPE_${type.toUpperCase()}`;
  }
  assetStatusLabel(status: AssetStatus): string {
    return `ASSETS.STATUS_${status.toUpperCase()}`;
  }
  money(value: string): string {
    return new Intl.NumberFormat(this.#translate.currentLang() || 'en', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value));
  }
}
