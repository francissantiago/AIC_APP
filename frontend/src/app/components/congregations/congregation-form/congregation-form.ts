import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppDialog } from '@components/app-dialog/app-dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { CONGREGATION_STATUSES, CongregationStatus } from '@enums/congregation-status';
import { CONGREGATION_TYPES, CongregationType } from '@enums/congregation-type';
import { IUpdateCongregation } from '@interfaces/IUpdateCongregation';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { CongregationContextService } from '@services/congregation-context-service';
import { CongregationService } from '@services/congregation-service';

@Component({
  selector: 'app-congregation-form',
  imports: [AppDialog, ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './congregation-form.html',
  styleUrl: './congregation-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CongregationForm {
  readonly #congregationService = inject(CongregationService);
  readonly #context = inject(CongregationContextService);
  readonly #apiError = inject(ApiErrorService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);

  readonly activeName = computed(() => this.#context.activeMembership()?.congregationName ?? '');
  readonly isHeadquartersActive = computed(
    () => this.#context.activeMembership()?.congregationType === CongregationType.HEADQUARTERS,
  );
  readonly canReadBranches = computed(() => this.#auth.hasPermission('congregations:read'));

  readonly statuses = CONGREGATION_STATUSES;
  readonly types = CONGREGATION_TYPES;

  readonly showForm = signal(true);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal(false);
  readonly feedbackKey = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);

  readonly canWrite = computed(() => this.#auth.hasPermission('congregations:write'));

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1), Validators.maxLength(150)],
    }),
    tradeName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(150)],
    }),
    type: new FormControl<CongregationType>(CongregationType.HEADQUARTERS, {
      nonNullable: true,
      validators: [Validators.required],
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

  constructor() {
    this.form.controls.type.disable();
    effect(() => {
      this.#context.contextVersion();
      if (this.#auth.isAuthenticated()) {
        this.#loadCongregation();
      }
    });
  }

  statusLabelKey(status: CongregationStatus): string {
    return `CONGREGATION.STATUS_${status.toUpperCase()}`;
  }

  typeLabelKey(type: CongregationType): string {
    return `CONGREGATION.TYPE_${type.toUpperCase()}`;
  }

  fieldInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  submit(): void {
    this.feedbackKey.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const body = this.#buildPayload();
    this.saving.set(true);

    this.#congregationService
      .update(body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (congregation) => {
          this.form.patchValue({
            name: congregation.name,
            tradeName: congregation.tradeName ?? '',
            type: congregation.type,
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
          this.saving.set(false);
          this.feedbackKey.set('CONGREGATION.SAVE_SUCCESS');
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.#applySaveError(error);
        },
      });
  }

  #loadCongregation(): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.#congregationService
      .get()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (congregation) => {
          this.form.patchValue({
            name: congregation.name,
            tradeName: congregation.tradeName ?? '',
            type: congregation.type,
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
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.loadError.set(true);
          this.feedbackKey.set(
            error.status === 404 ? 'CONGREGATION.NOT_FOUND' : 'CONGREGATION.LOAD_ERROR',
          );
        },
      });
  }

  #buildPayload(): IUpdateCongregation {
    const raw = this.form.getRawValue();
    const payload: IUpdateCongregation = {
      name: raw.name.trim(),
      status: raw.status,
    };

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

    return payload;
  }

  #applySaveError(error: HttpErrorResponse): void {
    const resolved = this.#apiError.resolve(error);
    this.feedbackKey.set(null);
    this.errorMessage.set(resolved.displayMessage);
    this.supportHint.set(resolved.supportHint ?? null);
  }
}
