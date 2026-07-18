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
import { AssetForm } from '@components/assets/asset-form/asset-form';
import { ASSET_STATUSES, ASSET_TYPES, AssetStatus, AssetType } from '@enums/finance';
import { IAsset } from '@interfaces/IFinance';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '@services/auth-service';
import { FinanceService } from '@services/finance-service';

@Component({
  selector: 'app-assets-list',
  imports: [AppDialog, AssetForm, ReactiveFormsModule, TranslatePipe],
  template: `
    <section class="w-full">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-xl font-semibold text-slate-900">{{ 'ASSETS.TITLE' | translate }}</h1>
        @if (canWrite()) {
          <button
            class="rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:opacity-50"
            type="button"
            (click)="openCreate()"
          >
            {{ 'ASSETS.NEW' | translate }}
          </button>
        }
      </div>
      <app-dialog
        [(open)]="showForm"
        [title]="(editing() ? 'ASSETS.EDIT' : 'ASSETS.NEW') | translate"
        (closed)="closeForm()"
      >
        <app-asset-form [asset]="editing()" (saved)="afterSave()" (cancelled)="closeForm()" />
      </app-dialog>
      <form
        [formGroup]="filterForm"
        (ngSubmit)="applyFilters()"
        class="mb-4 grid gap-3 md:grid-cols-4"
        [attr.aria-label]="'COMMON.FILTER' | translate"
      >
        <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700"
          ><span>{{ 'COMMON.SEARCH' | translate }}</span
          ><input
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            type="search"
            formControlName="q"
        /></label>
        <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700"
          ><span>{{ 'ASSETS.TYPE' | translate }}</span
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
          ><span>{{ 'ASSETS.STATUS' | translate }}</span
          ><select
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="status"
          >
            <option value="">{{ 'COMMON.FILTER' | translate }}</option>
            @for (status of statuses; track status) {
              <option [value]="status">{{ statusLabel(status) | translate }}</option>
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
      <app-dialog
        [open]="pendingDelete() !== null"
        [title]="'COMMON.CONFIRM_DELETE' | translate"
        (closed)="pendingDelete.set(null)"
      >
        <p>{{ 'ASSETS.CONFIRM_DELETE' | translate }}</p>
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
        <p role="alert" class="text-sm text-red-700">{{ 'ASSETS.LOAD_ERROR' | translate }}</p>
      } @else if (assets().length === 0) {
        <p class="text-sm text-slate-600">{{ 'ASSETS.EMPTY' | translate }}</p>
      } @else {
        <div class="overflow-x-auto rounded-md border border-slate-200">
          <table class="min-w-full text-left text-sm">
            <caption class="sr-only">
              {{
                'ASSETS.TITLE' | translate
              }}
            </caption>
            <thead class="bg-slate-50 text-slate-700">
              <tr>
                <th scope="col" class="px-3 py-2 font-medium">{{ 'ASSETS.TAG' | translate }}</th>
                <th scope="col" class="px-3 py-2 font-medium">{{ 'ASSETS.NAME' | translate }}</th>
                <th scope="col" class="px-3 py-2 font-medium">{{ 'ASSETS.TYPE' | translate }}</th>
                <th scope="col" class="px-3 py-2 font-medium">{{ 'ASSETS.STATUS' | translate }}</th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'ASSETS.LOCATION' | translate }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'ASSETS.CURRENT_VALUE' | translate }}
                </th>
                @if (canWrite()) {
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'COMMON.ACTIONS' | translate }}
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (asset of assets(); track asset.id) {
                <tr class="border-t border-slate-100">
                  <td class="px-3 py-2 text-slate-700">
                    {{ asset.assetTag || ('COMMON.NOT_AVAILABLE' | translate) }}
                  </td>
                  <td class="px-3 py-2 text-slate-900">{{ asset.name }}</td>
                  <td class="px-3 py-2 text-slate-700">
                    {{ typeLabel(asset.type) | translate }}
                  </td>
                  <td class="px-3 py-2 text-slate-700">
                    {{ statusLabel(asset.status) | translate }}
                  </td>
                  <td class="px-3 py-2 text-slate-700">
                    {{ asset.location || ('COMMON.NOT_AVAILABLE' | translate) }}
                  </td>
                  <td class="px-3 py-2 text-slate-900">
                    {{ money(asset.currentValue || asset.acquisitionValue || '0') }}
                  </td>
                  @if (canWrite()) {
                    <td class="px-3 py-2">
                      <div class="flex flex-wrap gap-2">
                        <button
                          class="text-slate-900 underline underline-offset-2 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                          type="button"
                          (click)="openEdit(asset)"
                        >
                          {{ 'COMMON.EDIT' | translate }}
                        </button>
                        <button
                          class="text-red-700 underline underline-offset-2 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          type="button"
                          (click)="pendingDelete.set(asset.id)"
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
export class AssetsList implements OnInit {
  readonly #finance = inject(FinanceService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #translate = inject(TranslateService);
  readonly assets = signal<IAsset[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly showForm = signal(false);
  readonly editing = signal<IAsset | null>(null);
  readonly pendingDelete = signal<string | null>(null);
  readonly types = ASSET_TYPES;
  readonly statuses = ASSET_STATUSES;
  readonly canWrite = computed(() => this.#auth.hasPermission('assets:write'));
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / 20)));
  readonly filterForm = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    type: new FormControl<AssetType | ''>('', { nonNullable: true }),
    status: new FormControl<AssetStatus | ''>('', { nonNullable: true }),
  });
  ngOnInit(): void {
    this.load();
  }
  openCreate(): void {
    this.editing.set(null);
    this.showForm.set(true);
  }
  openEdit(asset: IAsset): void {
    this.editing.set(asset);
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
  applyFilters(): void {
    this.page.set(1);
    this.load();
  }
  changePage(delta: number): void {
    this.page.update((v) => v + delta);
    this.load();
  }
  confirmDelete(id: string): void {
    this.#finance
      .removeAsset(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.pendingDelete.set(null);
          this.load();
        },
        error: () => this.error.set(true),
      });
  }
  typeLabel(type: AssetType): string {
    return `ASSETS.TYPE_${type.toUpperCase()}`;
  }
  statusLabel(status: AssetStatus): string {
    return `ASSETS.STATUS_${status.toUpperCase()}`;
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
    const v = this.filterForm.getRawValue();
    this.#finance
      .assets({
        page: this.page(),
        limit: 20,
        q: v.q.trim() || undefined,
        type: v.type || undefined,
        status: v.status || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (r) => {
          this.assets.set(r.data);
          this.total.set(r.total);
          this.page.set(r.page);
          this.loading.set(false);
        },
        error: () => {
          this.assets.set([]);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
