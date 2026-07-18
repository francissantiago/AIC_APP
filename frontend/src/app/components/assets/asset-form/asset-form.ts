import {
  ChangeDetectionStrategy,
  Component,
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
import { TranslatePipe } from '@ngx-translate/core';
import { FinanceService } from '@services/finance-service';

@Component({
  selector: 'app-asset-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  template: `
    <section class="mb-5 w-full max-w-7xl" aria-labelledby="asset-form-title">
      <h2 id="asset-form-title" class="mb-4 text-xl font-semibold text-slate-900">
        {{ (asset() ? 'ASSETS.EDIT' : 'ASSETS.NEW') | translate }}
      </h2>
      <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4 md:grid-cols-2" novalidate>
        <label class="flex flex-col gap-1 text-sm text-slate-700"
          ><span>{{ 'ASSETS.NAME' | translate }}</span
          ><input
            class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="name"
            maxlength="150"
            [attr.aria-invalid]="form.controls.name.touched && form.controls.name.invalid"
            [attr.aria-describedby]="
              form.controls.name.touched && form.controls.name.invalid ? 'asset-name-error' : null
            "
          />
          @if (form.controls.name.touched && form.controls.name.invalid) {
            <span id="asset-name-error" class="text-xs text-red-700">
              {{ 'COMMON.REQUIRED_FIELD' | translate }}
            </span>
          }
        </label>
        <label class="flex flex-col gap-1 text-sm text-slate-700"
          ><span>{{ 'ASSETS.TAG' | translate }}</span
          ><input
            class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="assetTag"
            maxlength="50"
        /></label>
        <label class="flex flex-col gap-1 text-sm text-slate-700"
          ><span>{{ 'ASSETS.TYPE' | translate }}</span
          ><select
            class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="type"
          >
            @for (type of types; track type) {
              <option [value]="type">{{ typeLabel(type) | translate }}</option>
            }
          </select></label
        >
        <label class="flex flex-col gap-1 text-sm text-slate-700"
          ><span>{{ 'ASSETS.STATUS' | translate }}</span
          ><select
            class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="status"
          >
            @for (status of statuses; track status) {
              <option [value]="status">{{ statusLabel(status) | translate }}</option>
            }
          </select></label
        >
        <label class="flex flex-col gap-1 text-sm text-slate-700"
          ><span>{{ 'ASSETS.ACQUISITION_DATE' | translate }}</span
          ><input
            class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            type="date"
            formControlName="acquisitionDate"
        /></label>
        <label class="flex flex-col gap-1 text-sm text-slate-700"
          ><span>{{ 'ASSETS.LOCATION' | translate }}</span
          ><input
            class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="location"
            maxlength="150"
        /></label>
        <label class="flex flex-col gap-1 text-sm text-slate-700"
          ><span>{{ 'ASSETS.ACQUISITION_VALUE' | translate }}</span
          ><input
            class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            type="number"
            min="0.01"
            step="0.01"
            formControlName="acquisitionValue"
            [attr.aria-invalid]="
              form.controls.acquisitionValue.touched && form.controls.acquisitionValue.invalid
            "
            [attr.aria-describedby]="
              form.controls.acquisitionValue.touched && form.controls.acquisitionValue.invalid
                ? 'asset-acquisition-value-error'
                : null
            "
          />
          @if (form.controls.acquisitionValue.touched && form.controls.acquisitionValue.invalid) {
            <span id="asset-acquisition-value-error" class="text-xs text-red-700">
              {{ 'FINANCE.INVALID_AMOUNT' | translate }}
            </span>
          }
        </label>
        <label class="flex flex-col gap-1 text-sm text-slate-700"
          ><span>{{ 'ASSETS.CURRENT_VALUE' | translate }}</span
          ><input
            class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            type="number"
            min="0.01"
            step="0.01"
            formControlName="currentValue"
            [attr.aria-invalid]="
              form.controls.currentValue.touched && form.controls.currentValue.invalid
            "
            [attr.aria-describedby]="
              form.controls.currentValue.touched && form.controls.currentValue.invalid
                ? 'asset-current-value-error'
                : null
            "
          />
          @if (form.controls.currentValue.touched && form.controls.currentValue.invalid) {
            <span id="asset-current-value-error" class="text-xs text-red-700">
              {{ 'FINANCE.INVALID_AMOUNT' | translate }}
            </span>
          }
        </label>
        <label class="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2"
          ><span>{{ 'FINANCE.NOTES' | translate }}</span
          ><textarea
            class="w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            rows="3"
            formControlName="notes"
          ></textarea>
        </label>
        @if (error()) {
          <p role="alert" class="text-sm text-red-700 md:col-span-2">
            {{ 'ASSETS.SAVE_ERROR' | translate }}
          </p>
        }
        <div class="mt-2 flex flex-wrap gap-3 md:col-span-2">
          <button
            class="rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:opacity-50"
            type="submit"
            [disabled]="saving()"
          >
            {{ 'COMMON.SAVE' | translate }}</button
          ><button
            class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            type="button"
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
  readonly #destroyRef = inject(DestroyRef);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly asset = input<IAsset | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();
  readonly saving = signal(false);
  readonly error = signal(false);
  readonly types = ASSET_TYPES;
  readonly statuses = ASSET_STATUSES;
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    assetTag: new FormControl('', { nonNullable: true }),
    type: new FormControl(AssetType.OTHER, { nonNullable: true }),
    status: new FormControl(AssetStatus.ACTIVE, { nonNullable: true }),
    acquisitionDate: new FormControl('', { nonNullable: true }),
    location: new FormControl('', { nonNullable: true }),
    acquisitionValue: new FormControl<number | null>(null, Validators.min(0.01)),
    currentValue: new FormControl<number | null>(null, Validators.min(0.01)),
    notes: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const a = this.asset();
      this.form.reset(
        a
          ? {
              name: a.name,
              assetTag: a.assetTag ?? '',
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

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.#focusFirstInvalid();
      return;
    }
    const v = this.form.getRawValue();
    const payload = {
      ...v,
      assetTag: v.assetTag || null,
      acquisitionDate: v.acquisitionDate || null,
      location: v.location || null,
      acquisitionValue: v.acquisitionValue || null,
      currentValue: v.currentValue || null,
      notes: v.notes || null,
    };
    const request = this.asset()
      ? this.#finance.updateAsset(this.asset()!.id, payload)
      : this.#finance.createAsset(payload);
    this.saving.set(true);
    this.error.set(false);
    request.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: () => {
        this.saving.set(false);
        this.error.set(true);
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
