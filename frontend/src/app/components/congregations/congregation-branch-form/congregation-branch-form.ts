import {
  ChangeDetectionStrategy,
  Component,
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
import { CONGREGATION_STATUSES, CongregationStatus } from '@enums/congregation-status';
import { ICreateBranch } from '@interfaces/ICreateBranch';
import { IUpdateCongregation } from '@interfaces/IUpdateCongregation';
import { ApiErrorService } from '@services/api-error.service';
import { CongregationsService } from '@services/congregations-service';

@Component({
  selector: 'app-congregation-branch-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './congregation-branch-form.html',
  styleUrl: './congregation-branch-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CongregationBranchForm implements OnInit {
  readonly #congregationsService = inject(CongregationsService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly congregationId = input<string | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly statuses = CONGREGATION_STATUSES;
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal(false);
  readonly feedbackKey = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1), Validators.maxLength(150)],
    }),
    tradeName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    document: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(30)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.email, Validators.maxLength(255)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(30)],
    }),
    address: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
    city: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(100)],
    }),
    state: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
    zipCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(20)],
    }),
    foundationDate: new FormControl('', { nonNullable: true }),
    website: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
    status: new FormControl<CongregationStatus>(CongregationStatus.ACTIVE, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    notes: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    const id = this.congregationId();
    if (id) {
      this.isEditMode.set(true);
      this.#loadCongregation(id);
    }
  }

  statusLabelKey(status: CongregationStatus): string {
    return `CONGREGATION.STATUS_${status.toUpperCase()}`;
  }

  fieldInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  submit(): void {
    this.feedbackKey.set(null);
    this.errorMessage.set(null);
    this.supportHint.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.isEditMode()) {
      this.#submitEdit();
      return;
    }

    this.#submitCreate();
  }

  cancel(): void {
    this.cancelled.emit();
  }

  #submitCreate(): void {
    const body = this.#buildCreatePayload();
    this.saving.set(true);

    this.#congregationsService
      .createBranch(body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.#applySaveError(error);
        },
      });
  }

  #submitEdit(): void {
    const id = this.congregationId();
    if (!id) {
      return;
    }

    const body = this.#buildUpdatePayload();
    this.saving.set(true);

    this.#congregationsService
      .update(id, body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.#applySaveError(error);
        },
      });
  }

  #loadCongregation(id: string): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.#congregationsService
      .getById(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (congregation) => {
          this.form.patchValue({
            name: congregation.name,
            tradeName: congregation.tradeName ?? '',
            document: congregation.document ?? '',
            email: congregation.email ?? '',
            phone: congregation.phone ?? '',
            address: congregation.address ?? '',
            city: congregation.city ?? '',
            state: congregation.state ?? '',
            zipCode: congregation.zipCode ?? '',
            foundationDate: congregation.foundationDate ?? '',
            website: congregation.website ?? '',
            status: congregation.status,
            notes: congregation.notes ?? '',
          });
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
        },
      });
  }

  #buildCreatePayload(): ICreateBranch {
    const raw = this.form.getRawValue();
    const payload: ICreateBranch = {
      name: raw.name.trim(),
      status: raw.status,
    };

    this.#appendOptionalFields(payload, raw);
    return payload;
  }

  #buildUpdatePayload(): IUpdateCongregation {
    const raw = this.form.getRawValue();
    const payload: IUpdateCongregation = {
      name: raw.name.trim(),
      status: raw.status,
    };

    this.#appendOptionalFields(payload, raw);
    return payload;
  }

  #appendOptionalFields(
    payload: ICreateBranch | IUpdateCongregation,
    raw: ReturnType<typeof this.form.getRawValue>,
  ): void {
    const tradeName = raw.tradeName.trim();
    if (tradeName) {
      payload.tradeName = tradeName;
    }
    const document = raw.document.trim();
    if (document) {
      payload.document = document;
    }
    const email = raw.email.trim();
    if (email) {
      payload.email = email;
    }
    const phone = raw.phone.trim();
    if (phone) {
      payload.phone = phone;
    }
    const address = raw.address.trim();
    if (address) {
      payload.address = address;
    }
    const city = raw.city.trim();
    if (city) {
      payload.city = city;
    }
    const state = raw.state.trim();
    if (state) {
      payload.state = state;
    }
    const zipCode = raw.zipCode.trim();
    if (zipCode) {
      payload.zipCode = zipCode;
    }
    if (raw.foundationDate) {
      payload.foundationDate = raw.foundationDate;
    }
    const website = raw.website.trim();
    if (website) {
      payload.website = website;
    }
    const notes = raw.notes.trim();
    if (notes) {
      payload.notes = notes;
    }
  }

  #applySaveError(error: HttpErrorResponse): void {
    const resolved = this.#apiError.resolve(error);
    this.errorMessage.set(resolved.displayMessage);
    this.supportHint.set(resolved.supportHint ?? null);
  }
}
