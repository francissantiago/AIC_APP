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
import { FINANCIAL_TYPES, FinancialType, PAYMENT_METHODS, PaymentMethod } from '@enums/finance';
import { IFinancialCategory, IFinancialEntry } from '@interfaces/IFinance';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiErrorService } from '@services/api-error.service';
import { FinanceService } from '@services/finance-service';

@Component({
  selector: 'app-financial-entry-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  template: `
    <section class="mb-5 w-full max-w-7xl" aria-labelledby="entry-form-title">
      <h2 id="entry-form-title" class="mb-4 text-xl font-semibold text-slate-900">
        {{ (entry() ? 'FINANCE.EDIT_ENTRY' : 'FINANCE.NEW_ENTRY') | translate }}
      </h2>
      <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4 md:grid-cols-2" novalidate>
        <label class="flex flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'FINANCE.ENTRY_DATE' | translate }}</span>
          <input
            class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            type="date"
            formControlName="entryDate"
            [attr.aria-invalid]="form.controls.entryDate.touched && form.controls.entryDate.invalid"
            [attr.aria-describedby]="
              form.controls.entryDate.touched && form.controls.entryDate.invalid
                ? 'entry-date-error'
                : null
            "
          />
          @if (form.controls.entryDate.touched && form.controls.entryDate.invalid) {
            <span id="entry-date-error" class="text-xs text-red-700">
              {{ 'COMMON.REQUIRED_FIELD' | translate }}
            </span>
          }
        </label>
        <label class="flex flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'FINANCE.TYPE' | translate }}</span>
          <select
            class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="type"
          >
            @for (type of financialTypes; track type) {
              <option [value]="type">{{ typeLabel(type) | translate }}</option>
            }
          </select>
        </label>
        <label class="flex flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'FINANCE.CATEGORY' | translate }}</span>
          <select
            class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="categoryId"
            [attr.aria-invalid]="
              form.controls.categoryId.touched && form.controls.categoryId.invalid
            "
            [attr.aria-describedby]="
              form.controls.categoryId.touched && form.controls.categoryId.invalid
                ? 'entry-category-error'
                : null
            "
          >
            <option value="">{{ 'FINANCE.SELECT_CATEGORY' | translate }}</option>
            @for (category of availableCategories(); track category.id) {
              <option [value]="category.id">{{ category.name }}</option>
            }
          </select>
          @if (form.controls.categoryId.touched && form.controls.categoryId.invalid) {
            <span id="entry-category-error" class="text-xs text-red-700">
              {{ 'COMMON.REQUIRED_FIELD' | translate }}
            </span>
          }
        </label>
        <label class="flex flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'FINANCE.AMOUNT' | translate }}</span>
          <input
            class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            type="number"
            min="0.01"
            step="0.01"
            formControlName="amount"
            [attr.aria-invalid]="form.controls.amount.touched && form.controls.amount.invalid"
            [attr.aria-describedby]="
              form.controls.amount.touched && form.controls.amount.invalid
                ? 'entry-amount-error'
                : null
            "
          />
          @if (form.controls.amount.touched && form.controls.amount.invalid) {
            <span id="entry-amount-error" class="text-xs text-red-700">
              {{ 'FINANCE.INVALID_AMOUNT' | translate }}
            </span>
          }
        </label>
        <label class="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
          <span>{{ 'FINANCE.DESCRIPTION' | translate }}</span>
          <input
            class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            maxlength="255"
            formControlName="description"
            [attr.aria-invalid]="
              form.controls.description.touched && form.controls.description.invalid
            "
            [attr.aria-describedby]="
              form.controls.description.touched && form.controls.description.invalid
                ? 'entry-description-error'
                : null
            "
          />
          @if (form.controls.description.touched && form.controls.description.invalid) {
            <span id="entry-description-error" class="text-xs text-red-700">
              {{ 'COMMON.REQUIRED_FIELD' | translate }}
            </span>
          }
        </label>
        <label class="flex flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'FINANCE.PAYMENT_METHOD' | translate }}</span>
          <select
            class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="paymentMethod"
          >
            @for (method of paymentMethods; track method) {
              <option [value]="method">{{ paymentLabel(method) | translate }}</option>
            }
          </select>
        </label>
        <label class="flex flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'FINANCE.REFERENCE' | translate }}</span>
          <input
            class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            maxlength="100"
            formControlName="reference"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
          <span>{{ 'FINANCE.NOTES' | translate }}</span>
          <textarea
            class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            rows="3"
            formControlName="notes"
          ></textarea>
        </label>
        @if (errorMessage(); as message) {
          <p class="text-sm text-red-700 md:col-span-2" role="alert">
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
            [disabled]="saving()"
          >
            {{ 'COMMON.SAVE' | translate }}
          </button>
          <button
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
export class FinancialEntryForm {
  readonly #finance = inject(FinanceService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly entry = input<IFinancialEntry | null>(null);
  readonly categories = input<readonly IFinancialCategory[]>([]);
  readonly saved = output<void>();
  readonly cancelled = output<void>();
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);
  readonly financialTypes = FINANCIAL_TYPES;
  readonly paymentMethods = PAYMENT_METHODS;

  readonly form = new FormGroup({
    entryDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    type: new FormControl(FinancialType.INCOME, { nonNullable: true }),
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    amount: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    paymentMethod: new FormControl(PaymentMethod.OTHER, { nonNullable: true }),
    reference: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });

  readonly availableCategories = () =>
    this.categories().filter(
      (category) =>
        category.type === this.form.controls.type.value &&
        (category.active || category.id === this.entry()?.categoryId),
    );

  constructor() {
    effect(() => {
      const entry = this.entry();
      if (entry) {
        this.form.reset({
          entryDate: entry.entryDate,
          type: entry.type,
          categoryId: entry.categoryId,
          description: entry.description,
          amount: Number(entry.amount),
          paymentMethod: entry.paymentMethod,
          reference: entry.reference ?? '',
          notes: entry.notes ?? '',
        });
      } else {
        this.form.reset({
          entryDate: this.#today(),
          type: FinancialType.INCOME,
          categoryId: '',
          description: '',
          amount: null,
          paymentMethod: PaymentMethod.OTHER,
          reference: '',
          notes: '',
        });
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.#focusFirstInvalid();
      return;
    }
    const value = this.form.getRawValue();
    const payload = {
      ...value,
      amount: value.amount as number,
      reference: value.reference || null,
      notes: value.notes || null,
    };
    const request = this.entry()
      ? this.#finance.updateEntry(this.entry()!.id, payload)
      : this.#finance.createEntry(payload);
    this.saving.set(true);
    this.errorMessage.set(null);
    this.supportHint.set(null);
    request.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
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

  typeLabel(type: FinancialType): string {
    return type === FinancialType.INCOME ? 'FINANCE.INCOME' : 'FINANCE.EXPENSE';
  }

  paymentLabel(method: PaymentMethod): string {
    return `FINANCE.PAYMENT.${method.toUpperCase()}`;
  }

  #focusFirstInvalid(): void {
    queueMicrotask(() => {
      this.#host.nativeElement
        .querySelector<HTMLElement>('input.ng-invalid, select.ng-invalid, textarea.ng-invalid')
        ?.focus();
    });
  }

  #today(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
