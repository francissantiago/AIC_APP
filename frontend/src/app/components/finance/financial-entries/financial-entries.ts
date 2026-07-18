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
import { AppDialog } from '@components/app-dialog/app-dialog';
import { FinancialCategoryManager } from '@components/finance/financial-category-manager/financial-category-manager';
import { FinancialEntryForm } from '@components/finance/financial-entry-form/financial-entry-form';
import { FINANCIAL_TYPES, FinancialType } from '@enums/finance';
import { IFinanceMemberOption, IFinancialCategory, IFinancialEntry } from '@interfaces/IFinance';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '@services/auth-service';
import { FinanceService } from '@services/finance-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-financial-entries',
  imports: [
    AppDialog,
    FinancialCategoryManager,
    FinancialEntryForm,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  template: `
    <section class="w-full">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-xl font-semibold text-slate-900">{{ 'FINANCE.ENTRIES' | translate }}</h1>
        @if (canWrite()) {
          <div class="flex gap-2">
            <button
              class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              type="button"
              (click)="toggleCategories()"
            >
              {{ 'FINANCE.CATEGORIES' | translate }}
            </button>
            <button
              class="rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:opacity-50"
              type="button"
              (click)="openCreate()"
            >
              {{ 'FINANCE.NEW_ENTRY' | translate }}
            </button>
          </div>
        }
      </div>
      <app-dialog
        [(open)]="showCategories"
        [title]="'FINANCE.CATEGORIES' | translate"
        (closed)="showCategories.set(false)"
      >
        <app-financial-category-manager
          [categories]="categories()"
          (changed)="loadCategories()"
          (closed)="showCategories.set(false)"
        />
      </app-dialog>
      <app-dialog
        [(open)]="showForm"
        [title]="(editing() ? 'FINANCE.EDIT_ENTRY' : 'FINANCE.NEW_ENTRY') | translate"
        (closed)="closeForm()"
      >
        <app-financial-entry-form
          [entry]="editing()"
          [categories]="categories()"
          (saved)="afterSave()"
          (cancelled)="closeForm()"
        />
      </app-dialog>
      <form
        [formGroup]="filterForm"
        class="mb-4 grid min-w-0 gap-3 md:grid-cols-4 xl:grid-cols-8"
        (ngSubmit)="applyFilters()"
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
            @for (type of types; track type) {
              <option [value]="type">{{ typeLabel(type) | translate }}</option>
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
        <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700"
          ><span>{{ 'FINANCE.FILTER_BY_MEMBER' | translate }}</span
          ><input
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            type="search"
            formControlName="memberQuery"
            [attr.placeholder]="'FINANCE.MEMBER_PLACEHOLDER' | translate"
            [attr.aria-label]="'FINANCE.MEMBER_PLACEHOLDER' | translate"
        /></label>
        <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700"
          ><span>{{ 'FINANCE.MEMBER' | translate }}</span
          ><select
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="memberId"
          >
            <option value="">{{ 'COMMON.FILTER' | translate }}</option>
            @for (option of memberOptions(); track option.id) {
              <option [value]="option.id">{{ option.fullName }}</option>
            }
          </select></label
        >
        <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700"
          ><span>{{ 'COMMON.SEARCH' | translate }}</span
          ><input
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            type="search"
            formControlName="q"
        /></label>
        <button
          class="self-end rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:opacity-50"
          type="submit"
        >
          {{ 'COMMON.FILTER' | translate }}
        </button>
      </form>
      <app-dialog
        [open]="pendingDelete() !== null"
        [title]="'COMMON.CONFIRM_DELETE' | translate"
        (closed)="pendingDelete.set(null)"
      >
        <p>{{ 'FINANCE.CONFIRM_DELETE_ENTRY' | translate }}</p>
        <div class="mt-4 flex gap-2">
          <button
            class="rounded-md bg-red-700 px-3 py-1.5 text-white hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            type="button"
            (click)="confirmDelete(pendingDelete()!)"
          >
            {{ 'COMMON.YES' | translate }}
          </button>
          <button
            class="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            type="button"
            (click)="pendingDelete.set(null)"
          >
            {{ 'COMMON.NO' | translate }}
          </button>
        </div>
      </app-dialog>
      @if (loading()) {
        <p class="text-sm text-slate-600" role="status">{{ 'COMMON.LOADING' | translate }}</p>
      } @else if (error()) {
        <p role="alert" class="text-sm text-red-700">{{ 'FINANCE.LOAD_ERROR' | translate }}</p>
      } @else if (entries().length === 0) {
        <p class="text-sm text-slate-600">{{ 'FINANCE.EMPTY_ENTRIES' | translate }}</p>
      } @else {
        <div class="overflow-x-auto rounded-md border border-slate-200">
          <table class="min-w-full text-left text-sm">
            <caption class="sr-only">
              {{
                'FINANCE.ENTRIES' | translate
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
                  {{ 'FINANCE.MEMBER' | translate }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'FINANCE.TYPE' | translate }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'FINANCE.AMOUNT' | translate }}
                </th>
                @if (canWrite()) {
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'COMMON.ACTIONS' | translate }}
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (entry of entries(); track entry.id) {
                <tr class="border-t border-slate-100">
                  <td class="px-3 py-2 text-slate-700">{{ entry.entryDate }}</td>
                  <td class="px-3 py-2 text-slate-900">{{ entry.description }}</td>
                  <td class="px-3 py-2 text-slate-700">{{ entry.category.name }}</td>
                  <td class="px-3 py-2 text-slate-700">
                    {{ entry.member?.fullName || ('FINANCE.ANONYMOUS' | translate) }}
                  </td>
                  <td class="px-3 py-2 text-slate-700">
                    {{ typeLabel(entry.type) | translate }}
                  </td>
                  <td class="px-3 py-2 text-slate-900">{{ money(entry.amount) }}</td>
                  @if (canWrite()) {
                    <td class="px-3 py-2">
                      <div class="flex flex-wrap gap-2">
                        <button
                          class="text-slate-900 underline underline-offset-2 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                          type="button"
                          (click)="openEdit(entry)"
                        >
                          {{ 'COMMON.EDIT' | translate }}
                        </button>
                        <button
                          class="text-red-700 underline underline-offset-2 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          type="button"
                          (click)="pendingDelete.set(entry.id)"
                        >
                          {{ 'COMMON.DELETE' | translate }}
                        </button>
                      </div>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
          <span>{{ 'COMMON.PAGE' | translate }} {{ page() }} / {{ totalPages() }}</span>
          <div class="flex gap-2">
            <button
              class="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
              [disabled]="page() <= 1"
              type="button"
              (click)="changePage(-1)"
            >
              {{ 'COMMON.PREVIOUS' | translate }}</button
            ><button
              class="rounded-md border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
              [disabled]="page() >= totalPages()"
              type="button"
              (click)="changePage(1)"
            >
              {{ 'COMMON.NEXT' | translate }}
            </button>
          </div>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialEntries implements OnInit {
  readonly #finance = inject(FinanceService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #translate = inject(TranslateService);
  readonly entries = signal<IFinancialEntry[]>([]);
  readonly categories = signal<IFinancialCategory[]>([]);
  readonly memberOptions = signal<IFinanceMemberOption[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly showForm = signal(false);
  readonly showCategories = signal(false);
  readonly editing = signal<IFinancialEntry | null>(null);
  readonly pendingDelete = signal<string | null>(null);
  readonly types = FINANCIAL_TYPES;
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / 20)));
  readonly canWrite = computed(() => this.#auth.hasPermission('finance:write'));
  readonly filterForm = new FormGroup({
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
    type: new FormControl<FinancialType | ''>('', { nonNullable: true }),
    categoryId: new FormControl('', { nonNullable: true }),
    memberId: new FormControl('', { nonNullable: true }),
    memberQuery: new FormControl('', { nonNullable: true }),
    q: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadCategories();
    this.loadMemberOptions();
    this.filterForm.controls.memberQuery.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.#destroyRef))
      .subscribe((q) => {
        const trimmed = q.trim();
        if (trimmed.length === 0 || trimmed.length >= 2) {
          this.loadMemberOptions(trimmed);
        }
      });
    this.load();
  }
  toggleCategories(): void {
    if (!this.showCategories()) {
      this.closeForm();
    }
    this.showCategories.update((value) => !value);
  }
  loadCategories(): void {
    this.#finance
      .categories()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({ next: (v) => this.categories.set(v), error: () => this.error.set(true) });
  }
  loadMemberOptions(q = ''): void {
    this.#finance
      .memberOptions({ q: q || undefined, limit: 20 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (options) => {
          const selectedId = this.filterForm.controls.memberId.value;
          const selected = this.memberOptions().find((item) => item.id === selectedId);
          const merged = [...options];
          if (selected && !merged.some((item) => item.id === selected.id)) {
            merged.unshift(selected);
          }
          this.memberOptions.set(merged);
        },
        error: () => this.memberOptions.set([]),
      });
  }
  applyFilters(): void {
    this.page.set(1);
    this.load();
  }
  changePage(delta: number): void {
    this.page.update((v) => v + delta);
    this.load();
  }
  openCreate(): void {
    this.showCategories.set(false);
    this.editing.set(null);
    this.showForm.set(true);
  }
  openEdit(entry: IFinancialEntry): void {
    this.showCategories.set(false);
    this.editing.set(entry);
    this.showForm.set(true);
  }
  closeForm(): void {
    this.showForm.set(false);
    this.editing.set(null);
  }
  afterSave(): void {
    this.closeForm();
    this.load();
  }
  confirmDelete(id: string): void {
    this.#finance
      .removeEntry(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.pendingDelete.set(null);
          this.load();
        },
        error: () => this.error.set(true),
      });
  }
  typeLabel(type: FinancialType): string {
    return type === FinancialType.INCOME ? 'FINANCE.INCOME' : 'FINANCE.EXPENSE';
  }
  money(value: string): string {
    return new Intl.NumberFormat(this.#translate.currentLang() || 'en', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value));
  }
  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const raw = this.filterForm.getRawValue();
    this.#finance
      .entries({
        page: this.page(),
        limit: 20,
        from: raw.from || undefined,
        to: raw.to || undefined,
        type: raw.type || undefined,
        categoryId: raw.categoryId || undefined,
        memberId: raw.memberId || undefined,
        q: raw.q.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (r) => {
          this.entries.set(r.data);
          this.total.set(r.total);
          this.page.set(r.page);
          this.loading.set(false);
        },
        error: () => {
          this.entries.set([]);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
