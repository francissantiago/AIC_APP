import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyInput } from '@components/currency-input/currency-input';
import { DateInput } from '@components/date-input/date-input';
import { TranslatePipe } from '@ngx-translate/core';
import { PAYMENT_METHODS, PaymentMethod } from '@enums/finance';
import { ICreateSocialProjectExpense } from '@interfaces/ISocialProjectExpenseQuery';
import { IFinanceMemberOption } from '@interfaces/IFinance';
import { ApiErrorService } from '@services/api-error.service';
import { FinanceService } from '@services/finance-service';
import { SocialProjectExpensesService } from '@services/social-project-expenses-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-social-project-expense-form',
  imports: [CurrencyInput, DateInput, ReactiveFormsModule, TranslatePipe],
  templateUrl: './social-project-expense-form.html',
  styleUrl: './social-project-expense-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialProjectExpenseForm implements OnInit {
  readonly #expensesService = inject(SocialProjectExpensesService);
  readonly #finance = inject(FinanceService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly projectId = input.required<string>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly paymentMethods = PAYMENT_METHODS;
  readonly memberOptions = signal<IFinanceMemberOption[]>([]);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);

  readonly form = new FormGroup({
    amount: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    entryDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)],
    }),
    paymentMethod: new FormControl(PaymentMethod.OTHER, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    memberQuery: new FormControl('', { nonNullable: true }),
    memberId: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
  });

  ngOnInit(): void {
    this.form.controls.memberQuery.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.#destroyRef))
      .subscribe((query) => {
        const trimmed = query.trim();
        if (trimmed.length === 0) {
          this.memberOptions.set([]);
          return;
        }
        if (trimmed.length >= 3) {
          this.#loadMemberOptions(trimmed);
        }
      });
  }

  paymentLabelKey(method: PaymentMethod): string {
    return `SOCIAL_PROJECTS.PAYMENT_${method.toUpperCase()}`;
  }

  fieldInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  submit(): void {
    this.errorMessage.set(null);
    this.supportHint.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.#expensesService
      .create(this.projectId(), this.#buildPayload())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.form.reset({
            amount: null,
            entryDate: '',
            description: '',
            paymentMethod: PaymentMethod.OTHER,
            memberQuery: '',
            memberId: '',
            notes: '',
          });
          this.memberOptions.set([]);
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
          this.supportHint.set(resolved.supportHint ?? null);
        },
      });
  }

  #loadMemberOptions(query: string): void {
    this.#finance
      .memberOptions({ q: query, limit: 20 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (options) => this.memberOptions.set(options),
        error: () => this.memberOptions.set([]),
      });
  }

  #buildPayload(): ICreateSocialProjectExpense {
    const raw = this.form.getRawValue();
    const payload: ICreateSocialProjectExpense = {
      amount: raw.amount ?? 0,
      entryDate: raw.entryDate,
      description: raw.description.trim(),
      paymentMethod: raw.paymentMethod,
    };
    const notes = raw.notes.trim();
    const memberId = raw.memberId.trim();
    if (notes) payload.notes = notes;
    if (memberId) payload.memberId = memberId;
    return payload;
  }
}
