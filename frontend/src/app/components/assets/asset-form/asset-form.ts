import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ASSET_STATUSES, ASSET_TYPES, AssetStatus, AssetType } from '@enums/finance';
import { IAsset } from '@interfaces/IFinance';
import { CurrencyInput } from '@components/currency-input/currency-input';
import { DateInput } from '@components/date-input/date-input';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiErrorService } from '@services/api-error.service';
import { FinanceService } from '@services/finance-service';

@Component({
  selector: 'app-asset-form',
  imports: [CurrencyInput, DateInput, ReactiveFormsModule, TranslatePipe],
  template: `
    <section
      class="w-full"
      data-testid="asset-form"
      [attr.aria-label]="(asset() ? 'ASSETS.EDIT' : 'ASSETS.NEW') | translate"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4 md:grid-cols-2" novalidate>
        @if (!asset()) {
          <label class="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
            <input type="checkbox" class="size-4" [formControl]="bulkModeControl" />
            <span>{{ 'ASSETS.BULK_MODE' | translate }}</span>
          </label>
        }

        <label class="flex flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'ASSETS.NAME' | translate }}</span>
          <input
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="name"
            maxlength="150"
            data-testid="asset-form-name"
            [attr.aria-invalid]="form.controls.name.touched && form.controls.name.invalid"
          />
          @if (form.controls.name.touched && form.controls.name.invalid) {
            <span class="text-xs text-red-700">{{ 'COMMON.REQUIRED_FIELD' | translate }}</span>
          }
        </label>

        @if (showSingleTag()) {
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            <span>{{ 'ASSETS.TAG' | translate }}</span>
            <input
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
              formControlName="assetTag"
              maxlength="50"
            />
          </label>
        }

        @if (bulkMode()) {
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            <span>{{ 'ASSETS.BULK_QUANTITY' | translate }}</span>
            <input
              type="number"
              min="2"
              max="500"
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              formControlName="quantity"
            />
          </label>
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            <span>{{ 'ASSETS.BULK_TAG_PREFIX' | translate }}</span>
            <input
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              formControlName="assetTagPrefix"
              maxlength="50"
            />
          </label>
          <label class="flex flex-col gap-1 text-sm text-slate-700">
            <span>{{ 'ASSETS.BULK_TAG_START' | translate }}</span>
            <input
              type="number"
              min="1"
              class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              formControlName="assetTagStartNumber"
            />
          </label>
        }

        <label class="flex flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'ASSETS.TYPE' | translate }}</span>
          <select
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="type"
          >
            @for (type of types; track type) {
              <option [value]="type">{{ typeLabel(type) | translate }}</option>
            }
          </select>
        </label>

        <label class="flex flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'ASSETS.STATUS' | translate }}</span>
          <select
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="status"
          >
            @for (status of statuses; track status) {
              <option [value]="status">{{ statusLabel(status) | translate }}</option>
            }
          </select>
        </label>

        <label class="flex flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'ASSETS.ACQUISITION_DATE' | translate }}</span>
          <app-date-input
            [control]="form.controls.acquisitionDate"
            inputId="asset-acquisition-date"
          />
        </label>

        <label class="flex flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'ASSETS.LOCATION' | translate }}</span>
          <input
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="location"
            maxlength="150"
          />
        </label>

        <label class="flex flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'ASSETS.ACQUISITION_VALUE' | translate }}</span>
          <app-currency-input
            [control]="form.controls.acquisitionValue"
            inputId="asset-acquisition-value"
            testId="asset-form-acquisition-value"
          />
        </label>

        <label class="flex flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'ASSETS.CURRENT_VALUE' | translate }}</span>
          <app-currency-input
            [control]="form.controls.currentValue"
            inputId="asset-current-value"
          />
        </label>

        <label class="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
          <span>{{ 'FINANCE.NOTES' | translate }}</span>
          <textarea
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            rows="3"
            formControlName="notes"
          ></textarea>
        </label>

        @if (errorMessage(); as message) {
          <p role="alert" class="text-sm text-red-700 md:col-span-2">
            {{ message }}
            @if (supportHint(); as hint) {
              <span class="mt-1 block text-xs opacity-90">{{ hint }}</span>
            }
          </p>
        }

        <div class="mt-2 flex flex-wrap gap-3 md:col-span-2">
          <button
            class="rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:opacity-50"
            type="submit"
            data-testid="asset-form-save"
            [disabled]="saving()"
          >
            {{ submitLabelKey() | translate }}
          </button>
          <button
            class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            type="button"
            data-testid="asset-form-cancel"
            (click)="cancelled.emit()"
          >
            {{ 'COMMON.CANCEL' | translate }}
          </button>
        </div>
      </form>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetForm {
  readonly #finance = inject(FinanceService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly asset = input<IAsset | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);
  readonly bulkMode = signal(false);
  readonly types = ASSET_TYPES;
  readonly statuses = ASSET_STATUSES;

  readonly bulkModeControl = new FormControl(false, { nonNullable: true });

  readonly showSingleTag = computed(() => !this.bulkMode() || !!this.asset());

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    assetTag: new FormControl('', { nonNullable: true }),
    quantity: new FormControl(2, { nonNullable: true, validators: [Validators.min(2), Validators.max(500)] }),
    assetTagPrefix: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
    assetTagStartNumber: new FormControl(1, { nonNullable: true, validators: [Validators.min(1)] }),
    type: new FormControl(AssetType.OTHER, { nonNullable: true }),
    status: new FormControl(AssetStatus.ACTIVE, { nonNullable: true }),
    acquisitionDate: new FormControl('', { nonNullable: true }),
    location: new FormControl('', { nonNullable: true }),
    acquisitionValue: new FormControl<number | null>(null, Validators.min(0.01)),
    currentValue: new FormControl<number | null>(null, Validators.min(0.01)),
    notes: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    this.bulkModeControl.valueChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((enabled) => this.bulkMode.set(enabled));

    effect(() => {
      const a = this.asset();
      this.bulkModeControl.setValue(false, { emitEvent: false });
      this.bulkMode.set(false);
      this.form.reset(
        a
          ? {
              name: a.name,
              assetTag: a.assetTag ?? '',
              quantity: 2,
              assetTagPrefix: '',
              assetTagStartNumber: 1,
              type: a.type,
              status: a.status,
              acquisitionDate: a.acquisitionDate ?? '',
              location: a.location ?? '',
              acquisitionValue: a.acquisitionValue ? Number(a.acquisitionValue) : null,
              currentValue: a.currentValue ? Number(a.currentValue) : null,
              notes: a.notes ?? '',
            }
          : {
              name: '',
              assetTag: '',
              quantity: 2,
              assetTagPrefix: '',
              assetTagStartNumber: 1,
              type: AssetType.OTHER,
              status: AssetStatus.ACTIVE,
              acquisitionDate: '',
              location: '',
              acquisitionValue: null,
              currentValue: null,
              notes: '',
            },
      );
    });
  }

  submitLabelKey(): string {
    if (this.asset()) {
      return 'COMMON.SAVE';
    }
    return this.bulkMode() ? 'ASSETS.BULK_CREATE' : 'COMMON.SAVE';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.#focusFirstInvalid();
      return;
    }

    const v = this.form.getRawValue();
    const basePayload = {
      name: v.name,
      type: v.type,
      status: v.status,
      acquisitionDate: v.acquisitionDate || null,
      location: v.location || null,
      acquisitionValue: v.acquisitionValue || null,
      currentValue: v.currentValue || null,
      notes: v.notes || null,
    };

    this.saving.set(true);
    this.errorMessage.set(null);
    this.supportHint.set(null);

    if (this.asset()) {
      this.#finance
        .updateAsset(this.asset()!.id, {
          ...basePayload,
          assetTag: v.assetTag || null,
        })
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit();
          },
          error: (error: unknown) => {
            this.saving.set(false);
            const resolved = this.#apiError.resolve(error);
            this.errorMessage.set(resolved.displayMessage);
            this.supportHint.set(resolved.supportHint ?? null);
          },
        });
      return;
    }

    if (this.bulkMode()) {
      this.#finance
        .createAssetsBulk({
          ...basePayload,
          quantity: v.quantity,
          assetTagPrefix: v.assetTagPrefix.trim() || null,
          assetTagStartNumber: v.assetTagStartNumber,
        })
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit();
          },
          error: (error: unknown) => {
            this.saving.set(false);
            const resolved = this.#apiError.resolve(error);
            this.errorMessage.set(resolved.displayMessage);
            this.supportHint.set(resolved.supportHint ?? null);
          },
        });
      return;
    }

    this.#finance
      .createAsset({
        ...basePayload,
        assetTag: v.assetTag || null,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
          this.supportHint.set(resolved.supportHint ?? null);
        },
      });
  }

  typeLabel(type: AssetType): string {
    return `ASSETS.TYPE_${type.toUpperCase()}`;
  }

  statusLabel(status: AssetStatus): string {
    return `ASSETS.STATUS_${status.toUpperCase()}`;
  }

  #focusFirstInvalid(): void {
    queueMicrotask(() => {
      this.#host.nativeElement
        .querySelector<HTMLElement>('input.ng-invalid, select.ng-invalid, textarea.ng-invalid')
        ?.focus();
    });
  }
}
