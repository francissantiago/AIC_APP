import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { MemberTransfersService } from '@services/member-transfers-service';
import { SecretariatService } from '@services/secretariat-service';

type WizardStep = 1 | 2 | 3;

@Component({
  selector: 'app-member-transfer-wizard',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './member-transfer-wizard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberTransferWizard {
  readonly #transfersService = inject(MemberTransfersService);
  readonly #secretariatService = inject(SecretariatService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly memberId = input.required<string>();
  readonly memberFullName = input.required<string>();

  readonly completed = output<void>();
  readonly cancelled = output<void>();

  readonly step = signal<WizardStep>(1);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly uploadWarning = signal<string | null>(null);
  readonly createdDocumentId = signal<string | null>(null);
  readonly successDone = signal(false);

  readonly canWriteSecretariat = computed(() => this.#auth.hasPermission('secretariat:write'));

  readonly letterSummaryPreview = computed(() => {
    const raw = this.form.getRawValue();
    const lines = [
      `Membro: ${this.memberFullName()}`,
      `Igreja de destino: ${raw.destinationChurchName || '—'}`,
      `Cidade de destino: ${raw.destinationCity || '—'}`,
    ];
    const notes = raw.notes.trim();
    if (notes) {
      lines.push(`Observações: ${notes}`);
    }
    return lines.join('\n');
  });

  readonly form = new FormGroup({
    destinationChurchName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1), Validators.maxLength(200)],
    }),
    destinationCity: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1), Validators.maxLength(100)],
    }),
    notes: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(5000)],
    }),
  });

  fieldInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  goDestination(): void {
    this.step.set(1);
  }

  goPreview(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.step.set(2);
  }

  goConfirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.step.set(1);
      return;
    }
    this.step.set(3);
  }

  submit(): void {
    const memberId = this.memberId();
    if (!memberId || this.form.invalid) {
      this.form.markAllAsTouched();
      this.step.set(1);
      return;
    }

    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set(null);
    this.uploadWarning.set(null);

    this.#transfersService
      .create(memberId, {
        destinationChurchName: raw.destinationChurchName.trim(),
        destinationCity: raw.destinationCity.trim(),
        notes: raw.notes.trim() || null,
        completeNow: true,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (transfer) => {
          this.saving.set(false);
          this.createdDocumentId.set(transfer.documentId);
          this.successDone.set(true);
          if (!this.canWriteSecretariat() || !transfer.documentId) {
            this.completed.emit();
          }
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.errorMessage.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const documentId = this.createdDocumentId();
    if (!file || !documentId || !this.canWriteSecretariat()) {
      return;
    }

    this.uploading.set(true);
    this.uploadWarning.set(null);

    this.#secretariatService
      .uploadDocumentFile(documentId, file)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.uploading.set(false);
          this.completed.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.uploading.set(false);
          this.uploadWarning.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }

  finishWithoutUpload(): void {
    this.completed.emit();
  }
}
