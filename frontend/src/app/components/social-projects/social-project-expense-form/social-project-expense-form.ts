import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DateInput } from '@components/date-input/date-input';
import { TranslatePipe } from '@ngx-translate/core';
import { PAYMENT_METHODS, PaymentMethod } from '@enums/finance';
import { ICreateSocialProjectExpense } from '@interfaces/ISocialProjectExpenseQuery';
import { ApiErrorService } from '@services/api-error.service';
import { SocialProjectExpensesService } from '@services/social-project-expenses-service';

@Component({
  selector: 'app-social-project-expense-form',
  imports: [DateInput, ReactiveFormsModule, TranslatePipe],
  templateUrl: './social-project-expense-form.html',
  styleUrl: './social-project-expense-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialProjectExpenseForm {
  readonly #expensesService = inject(SocialProjectExpensesService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly projectId = input.required<string>();
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly paymentMethods = PAYMENT_METHODS;
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
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
  });

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
            notes: '',
          });
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

  #buildPayload(): ICreateSocialProjectExpense {
    const raw = this.form.getRawValue();
    const payload: ICreateSocialProjectExpense = {
      amount: raw.amount ?? 0,
      entryDate: raw.entryDate,
      description: raw.description.trim(),
      paymentMethod: raw.paymentMethod,
    };
    const notes = raw.notes.trim();
    if (notes) payload.notes = notes;
    return payload;
  }
}
