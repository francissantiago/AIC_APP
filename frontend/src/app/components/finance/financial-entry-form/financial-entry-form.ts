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
import { IFinanceMemberOption, IFinancialCategory, IFinancialEntry } from '@interfaces/IFinance';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiErrorService } from '@services/api-error.service';
import { FinanceService } from '@services/finance-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

const LINKABLE_CATEGORY_NAMES = new Set(['dízimos', 'ofertas', 'doações']);

@Component({
  selector: 'app-financial-entry-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  template: `
    <section
      class="w-full"
      data-testid="finance-entry-form"
      [attr.aria-label]="(entry() ? 'FINANCE.EDIT_ENTRY' : 'FINANCE.NEW_ENTRY') | translate"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4 md:grid-cols-2" novalidate>
        <label class="flex flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'FINANCE.ENTRY_DATE' | translate }}</span>
          <input
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
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
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="type"
            data-testid="finance-entry-form-type"
          >
            @for (type of financialTypes; track type) {
              <option [value]="type">{{ typeLabel(type) | translate }}</option>
            }
          </select>
        </label>
        <label class="flex flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'FINANCE.CATEGORY' | translate }}</span>
          <select
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="categoryId"
            data-testid="finance-entry-form-category"
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
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            type="number"
            min="0.01"
            step="0.01"
            formControlName="amount"
            data-testid="finance-entry-form-amount"
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
        @if (showMemberField()) {
          <div class="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
            <label class="flex flex-col gap-1">
              <span>{{ 'FINANCE.MEMBER_OPTIONAL' | translate }}</span>
              <input
                class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
                type="search"
                formControlName="memberQuery"
                [attr.placeholder]="'FINANCE.MEMBER_PLACEHOLDER' | translate"
                [attr.aria-label]="'FINANCE.MEMBER_PLACEHOLDER' | translate"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="sr-only">{{ 'FINANCE.SELECT_MEMBER' | translate }}</span>
              <select
                class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
                formControlName="memberId"
                data-testid="finance-entry-form-member"
              >
                <option value="">{{ 'FINANCE.ANONYMOUS' | translate }}</option>
                @for (option of memberOptions(); track option.id) {
                  <option [value]="option.id">{{ option.fullName }}</option>
                }
              </select>
            </label>
            <span class="text-xs text-slate-500">{{ 'FINANCE.MEMBER_HINT' | translate }}</span>
          </div>
        }
        <label class="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
          <span>{{ 'FINANCE.DESCRIPTION' | translate }}</span>
          <input
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            maxlength="255"
            formControlName="description"
            data-testid="finance-entry-form-description"
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
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
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
            class="w-full min-w-0 rounded-md border border-slate-200 px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            maxlength="100"
            formControlName="reference"
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
            data-testid="finance-entry-form-save"
            [disabled]="saving()"
          >
            {{ 'COMMON.SAVE' | translate }}
          </button>
          <button
            class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            type="button"
            data-testid="finance-entry-form-cancel"
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
  readonly showMemberField = signal(false);
  readonly memberOptions = signal<IFinanceMemberOption[]>([]);
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
    memberId: new FormControl('', { nonNullable: true }),
    memberQuery: new FormControl('', { nonNullable: true }),
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
          memberId: entry.memberId ?? '',
          memberQuery: '',
        });
        if (entry.member) {
          this.#ensureMemberOption(entry.member);
        }
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
          memberId: '',
          memberQuery: '',
        });
        this.memberOptions.set([]);
      }
      this.#syncMemberField(false);
    });

    this.form.controls.type.valueChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#syncMemberField(true));
    this.form.controls.categoryId.valueChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#syncMemberField(true));

    this.form.controls.memberQuery.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.#destroyRef))
      .subscribe((q) => {
        if (!this.showMemberField()) {
          return;
        }
        const trimmed = q.trim();
        if (trimmed.length === 0 || trimmed.length >= 2) {
          this.#loadMemberOptions(trimmed);
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
      entryDate: value.entryDate,
      type: value.type,
      categoryId: value.categoryId,
      description: value.description,
      amount: value.amount as number,
      paymentMethod: value.paymentMethod,
      reference: value.reference || null,
      notes: value.notes || null,
      memberId: this.showMemberField() ? value.memberId || null : null,
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

  /** Exposed for Vitest — visibility rule for member field. */
  isMemberLinkable(type: FinancialType, categoryId: string): boolean {
    return this.#isMemberLinkable(type, categoryId);
  }

  #syncMemberField(clearWhenHidden: boolean): void {
    const linkable = this.#isMemberLinkable(
      this.form.controls.type.value,
      this.form.controls.categoryId.value,
    );
    this.showMemberField.set(linkable);
    if (!linkable) {
      if (clearWhenHidden) {
        this.form.controls.memberId.setValue('', { emitEvent: false });
      }
      return;
    }
    this.#loadMemberOptions(this.form.controls.memberQuery.value.trim());
  }

  #isMemberLinkable(type: FinancialType, categoryId: string): boolean {
    if (type !== FinancialType.INCOME || !categoryId) {
      return false;
    }
    const category = this.categories().find((item) => item.id === categoryId);
    if (!category) {
      return false;
    }
    return LINKABLE_CATEGORY_NAMES.has(category.name.trim().toLowerCase());
  }

  #loadMemberOptions(q = ''): void {
    this.#finance
      .memberOptions({ q: q || undefined, limit: 20 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (options) => {
          const selectedId = this.form.controls.memberId.value;
          const selected = this.memberOptions().find((item) => item.id === selectedId);
          const merged = [...options];
          if (selected && !merged.some((item) => item.id === selected.id)) {
            merged.unshift(selected);
          }
          const entryMember = this.entry()?.member;
          if (entryMember && !merged.some((item) => item.id === entryMember.id)) {
            merged.unshift(entryMember);
          }
          this.memberOptions.set(merged);
        },
        error: () => this.memberOptions.set([]),
      });
  }

  #ensureMemberOption(member: IFinanceMemberOption): void {
    this.memberOptions.update((options) => {
      if (options.some((item) => item.id === member.id)) {
        return options;
      }
      return [member, ...options];
    });
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
