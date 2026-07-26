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
import { HttpErrorResponse } from '@angular/common/http';
import { TranslatePipe } from '@ngx-translate/core';
import { PAYMENT_METHODS, PaymentMethod } from '@enums/finance';
import {
  MISSION_BOOKLET_INSTALLMENT_STATUSES,
  MissionBookletInstallmentStatus,
} from '@enums/mission-booklet-installment-status';
import { IMissionBookletInstallment } from '@interfaces/IMissionBooklet';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { MissionBookletsService } from '@services/mission-booklets-service';

@Component({
  selector: 'app-mission-booklet-installments-panel',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './mission-booklet-installments-panel.html',
  styleUrl: './mission-booklet-installments-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionBookletInstallmentsPanel implements OnInit {
  readonly #bookletsService = inject(MissionBookletsService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly bookletId = input.required<string>();
  readonly bookletCancelled = input(false);
  readonly changed = output<void>();

  readonly installments = signal<IMissionBookletInstallment[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly payingId = signal<string | null>(null);
  readonly cancellingId = signal<string | null>(null);
  readonly payTargetId = signal<string | null>(null);
  readonly feedbackKey = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly paymentMethods = PAYMENT_METHODS;
  readonly InstallmentStatus = MissionBookletInstallmentStatus;

  readonly payForm = new FormGroup({
    paymentMethod: new FormControl(PaymentMethod.OTHER, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    paidAt: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] }),
  });

  readonly canWrite = computed(() => this.#auth.hasPermission('missions:write'));

  ngOnInit(): void {
    this.#loadInstallments();
  }

  statusLabelKey(status: MissionBookletInstallmentStatus): string {
    return `MISSIONS.BOOKLETS.INSTALLMENT_STATUS_${status.toUpperCase()}`;
  }

  paymentLabelKey(method: PaymentMethod): string {
    return `MISSIONS.BOOKLETS.PAYMENT_${method.toUpperCase()}`;
  }

  openPay(installmentId: string): void {
    this.payTargetId.set(installmentId);
    this.errorMessage.set(null);
    this.feedbackKey.set(null);
    this.payForm.reset({
      paymentMethod: PaymentMethod.OTHER,
      paidAt: '',
      notes: '',
    });
  }

  cancelPay(): void {
    this.payTargetId.set(null);
  }

  submitPay(installmentId: string): void {
    if (this.payForm.invalid) {
      this.payForm.markAllAsTouched();
      return;
    }

    const raw = this.payForm.getRawValue();
    this.payingId.set(installmentId);
    this.errorMessage.set(null);

    this.#bookletsService
      .payInstallment(this.bookletId(), installmentId, {
        paymentMethod: raw.paymentMethod,
        paidAt: raw.paidAt || undefined,
        notes: raw.notes.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.payingId.set(null);
          this.payTargetId.set(null);
          this.feedbackKey.set('MISSIONS.BOOKLETS.PAY_SUCCESS');
          this.#loadInstallments();
          this.changed.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.payingId.set(null);
          this.errorMessage.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }

  cancelInstallment(installmentId: string): void {
    this.cancellingId.set(installmentId);
    this.errorMessage.set(null);

    this.#bookletsService
      .cancelInstallment(this.bookletId(), installmentId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.cancellingId.set(null);
          this.feedbackKey.set('MISSIONS.BOOKLETS.CANCEL_INSTALLMENT_SUCCESS');
          this.#loadInstallments();
          this.changed.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.cancellingId.set(null);
          this.errorMessage.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }

  #loadInstallments(): void {
    this.loading.set(true);
    this.error.set(false);

    this.#bookletsService
      .listInstallments(this.bookletId())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (items) => {
          this.installments.set(items);
          this.loading.set(false);
        },
        error: () => {
          this.installments.set([]);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
