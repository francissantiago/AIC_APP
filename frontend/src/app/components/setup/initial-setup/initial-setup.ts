import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { DateInput } from '@components/date-input/date-input';
import { LanguageSwitcher } from '@components/layout/language-switcher/language-switcher';
import {
  ICompleteSetupRequest,
  ISetupCongregationRequest,
} from '@interfaces/ICompleteSetupRequest';
import { SetupService } from '@services/setup-service';

const SETUP_STEPS = ['admin', 'congregation', 'confirm'] as const;

type SetupStep = (typeof SETUP_STEPS)[number];
type AdminField = 'username' | 'email' | 'fullName' | 'password' | 'passwordConfirm';
type CongregationField =
  | 'name'
  | 'tradeName'
  | 'document'
  | 'email'
  | 'phone'
  | 'address'
  | 'city'
  | 'state'
  | 'zipCode'
  | 'foundationDate'
  | 'website';
type OptionalCongregationField = Exclude<CongregationField, 'name'>;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value as string | undefined;
  const confirmation = group.get('passwordConfirm')?.value as string | undefined;

  if (!password || !confirmation || password === confirmation) {
    return null;
  }

  return { passwordMismatch: true };
}

@Component({
  selector: 'app-initial-setup',
  imports: [DateInput, ReactiveFormsModule, RouterLink, TranslatePipe, LanguageSwitcher],
  templateUrl: './initial-setup.html',
  styleUrl: './initial-setup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InitialSetup {
  readonly #setupService = inject(SetupService);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  readonly loading = this.#setupService.loading;
  readonly serviceError = this.#setupService.error;

  readonly step = signal<SetupStep>('admin');
  readonly adminSubmitted = signal(false);
  readonly congregationSubmitted = signal(false);
  readonly submitFailed = signal(false);
  readonly alreadyConfigured = signal(false);
  readonly succeeded = signal(false);

  readonly stepIndex = computed(() => SETUP_STEPS.indexOf(this.step()));

  readonly steps: readonly { id: SetupStep; labelKey: string }[] = [
    { id: 'admin', labelKey: 'SETUP.STEP_ADMIN' },
    { id: 'congregation', labelKey: 'SETUP.STEP_CONGREGATION' },
    { id: 'confirm', labelKey: 'SETUP.STEP_CONFIRM' },
  ];

  readonly form = new FormGroup({
    admin: new FormGroup(
      {
        username: new FormControl('', {
          nonNullable: true,
          validators: [
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(50),
            Validators.pattern(/^[a-zA-Z0-9._-]+$/),
          ],
        }),
        email: new FormControl('', {
          nonNullable: true,
          validators: [Validators.required, Validators.email, Validators.maxLength(255)],
        }),
        fullName: new FormControl('', {
          nonNullable: true,
          validators: [Validators.required, Validators.maxLength(150)],
        }),
        password: new FormControl('', {
          nonNullable: true,
          validators: [Validators.required, Validators.minLength(8), Validators.maxLength(72)],
        }),
        passwordConfirm: new FormControl('', {
          nonNullable: true,
          validators: [Validators.required],
        }),
      },
      { validators: passwordsMatch },
    ),
    congregation: new FormGroup({
      name: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(150)],
      }),
      tradeName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(150)],
      }),
      document: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.email, Validators.maxLength(255)],
      }),
      phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
      address: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] }),
      city: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
      state: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(50)] }),
      zipCode: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(20)] }),
      foundationDate: new FormControl('', { nonNullable: true }),
      website: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] }),
    }),
  });

  adminFieldInvalid(field: AdminField): boolean {
    const control = this.form.controls.admin.controls[field];
    return control.invalid && (control.dirty || control.touched || this.adminSubmitted());
  }

  congregationFieldInvalid(field: CongregationField): boolean {
    const control = this.form.controls.congregation.controls[field];
    return control.invalid && (control.dirty || control.touched || this.congregationSubmitted());
  }

  passwordMismatch(): boolean {
    const group = this.form.controls.admin;
    return group.hasError('passwordMismatch') && (group.dirty || this.adminSubmitted());
  }

  summary(): { labelKey: string; value: string }[] {
    const raw = this.form.getRawValue();

    return [
      { labelKey: 'SETUP.ADMIN_USERNAME', value: raw.admin.username },
      { labelKey: 'SETUP.ADMIN_EMAIL', value: raw.admin.email },
      { labelKey: 'SETUP.ADMIN_FULL_NAME', value: raw.admin.fullName },
      { labelKey: 'SETUP.CONGREGATION_NAME', value: raw.congregation.name },
      { labelKey: 'SETUP.CONGREGATION_CITY', value: raw.congregation.city },
      { labelKey: 'SETUP.CONGREGATION_STATE', value: raw.congregation.state },
    ].filter((row) => row.value.trim().length > 0);
  }

  next(): void {
    const current = this.step();

    if (current === 'admin') {
      this.adminSubmitted.set(true);
      if (this.form.controls.admin.invalid) {
        this.form.controls.admin.markAllAsTouched();
        return;
      }
      this.step.set('congregation');
      return;
    }

    if (current === 'congregation') {
      this.congregationSubmitted.set(true);
      if (this.form.controls.congregation.invalid) {
        this.form.controls.congregation.markAllAsTouched();
        return;
      }
      this.step.set('confirm');
    }
  }

  back(): void {
    const current = this.step();

    if (current === 'confirm') {
      this.step.set('congregation');
      return;
    }

    if (current === 'congregation') {
      this.step.set('admin');
    }
  }

  submit(): void {
    this.adminSubmitted.set(true);
    this.congregationSubmitted.set(true);
    this.submitFailed.set(false);
    this.alreadyConfigured.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.step.set(this.form.controls.admin.invalid ? 'admin' : 'congregation');
      return;
    }

    this.#setupService
      .complete(this.#buildPayload())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.succeeded.set(true);
          void this.#router.navigate(['/login']);
        },
        error: (error: HttpErrorResponse) => {
          this.submitFailed.set(true);
          this.alreadyConfigured.set(error.status === 409);
        },
      });
  }

  #buildPayload(): ICompleteSetupRequest {
    const raw = this.form.getRawValue();

    const congregation: ISetupCongregationRequest = { name: raw.congregation.name.trim() };
    const optionalFields: readonly OptionalCongregationField[] = [
      'tradeName',
      'document',
      'email',
      'phone',
      'address',
      'city',
      'state',
      'zipCode',
      'foundationDate',
      'website',
    ];

    for (const field of optionalFields) {
      const value = raw.congregation[field].trim();
      if (value) {
        congregation[field] = value;
      }
    }

    return {
      admin: {
        username: raw.admin.username.trim(),
        email: raw.admin.email.trim(),
        fullName: raw.admin.fullName.trim(),
        password: raw.admin.password,
      },
      congregation,
    };
  }
}
