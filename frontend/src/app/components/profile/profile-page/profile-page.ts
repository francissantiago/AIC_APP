import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
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
import { TranslatePipe } from '@ngx-translate/core';
import { ITwoFactorSetupResponse } from '@interfaces/ITwoFactorSetupResponse';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (!newPassword && !confirmPassword) {
    return null;
  }
  return newPassword === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage implements OnInit {
  readonly #authService = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly currentUser = this.#authService.currentUser;
  readonly twoFactorEnabled = computed(() => !!this.currentUser()?.twoFactorEnabled);

  readonly profileSaving = signal(false);
  readonly passwordSaving = signal(false);
  readonly twoFaLoading = signal(false);
  readonly setupData = signal<ITwoFactorSetupResponse | null>(null);

  readonly profileFeedbackKey = signal<string | null>(null);
  readonly passwordFeedbackKey = signal<string | null>(null);
  readonly twoFaFeedbackKey = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly profileSubmitted = signal(false);
  readonly passwordSubmitted = signal(false);
  readonly verifySubmitted = signal(false);
  readonly disableSubmitted = signal(false);

  readonly profileForm = new FormGroup({
    username: new FormControl({ value: '', disabled: true }, { nonNullable: true }),
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(255)],
    }),
  });

  readonly passwordForm = new FormGroup(
    {
      currentPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(8), Validators.maxLength(72)],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: passwordsMatchValidator },
  );

  readonly verifyForm = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
    }),
  });

  readonly disableForm = new FormGroup({
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
    }),
  });

  ngOnInit(): void {
    const user = this.currentUser();
    if (user) {
      this.#patchProfileForm(user.username, user.fullName, user.email);
      return;
    }

    this.#authService
      .loadMe()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (loaded) => {
          if (loaded) {
            this.#patchProfileForm(loaded.username, loaded.fullName, loaded.email);
          }
        },
      });
  }

  profileFieldInvalid(controlName: 'fullName' | 'email'): boolean {
    const control = this.profileForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched || this.profileSubmitted());
  }

  passwordFieldInvalid(
    controlName: 'currentPassword' | 'newPassword' | 'confirmPassword',
  ): boolean {
    const control = this.passwordForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched || this.passwordSubmitted());
  }

  passwordMismatch(): boolean {
    return (
      !!this.passwordForm.errors?.['passwordMismatch'] &&
      (this.passwordForm.dirty || this.passwordSubmitted())
    );
  }

  saveProfile(): void {
    this.profileSubmitted.set(true);
    this.profileFeedbackKey.set(null);
    this.errorMessage.set(null);

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const { fullName, email } = this.profileForm.getRawValue();
    this.profileSaving.set(true);

    this.#authService
      .updateMe({ fullName: fullName.trim(), email: email.trim() })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (user) => {
          this.profileSaving.set(false);
          this.#patchProfileForm(user.username, user.fullName, user.email);
          this.profileFeedbackKey.set('PROFILE.SUCCESS_PROFILE');
        },
        error: (error: HttpErrorResponse) => {
          this.profileSaving.set(false);
          this.errorMessage.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }

  changePassword(): void {
    this.passwordSubmitted.set(true);
    this.passwordFeedbackKey.set(null);
    this.errorMessage.set(null);

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.passwordSaving.set(true);

    this.#authService
      .changePassword({ currentPassword, newPassword })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.passwordSaving.set(false);
          this.passwordForm.reset();
          this.passwordSubmitted.set(false);
          this.passwordFeedbackKey.set('PROFILE.SUCCESS_PASSWORD');
        },
        error: (error: HttpErrorResponse) => {
          this.passwordSaving.set(false);
          this.errorMessage.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }

  startTwoFactorSetup(): void {
    this.twoFaFeedbackKey.set(null);
    this.errorMessage.set(null);
    this.twoFaLoading.set(true);

    this.#authService
      .setupTwoFactor()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (data) => {
          this.twoFaLoading.set(false);
          this.setupData.set(data);
          this.verifyForm.reset();
        },
        error: (error: HttpErrorResponse) => {
          this.twoFaLoading.set(false);
          this.errorMessage.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }

  verifyTwoFactor(): void {
    this.verifySubmitted.set(true);
    this.twoFaFeedbackKey.set(null);
    this.errorMessage.set(null);

    if (this.verifyForm.invalid) {
      this.verifyForm.markAllAsTouched();
      return;
    }

    const { code } = this.verifyForm.getRawValue();
    this.twoFaLoading.set(true);

    this.#authService
      .verifyTwoFactor({ code })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.twoFaLoading.set(false);
          this.setupData.set(null);
          this.verifyForm.reset();
          this.verifySubmitted.set(false);
          this.twoFaFeedbackKey.set('PROFILE.SUCCESS_2FA_ENABLED');
        },
        error: (error: HttpErrorResponse) => {
          this.twoFaLoading.set(false);
          this.errorMessage.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }

  disableTwoFactor(): void {
    this.disableSubmitted.set(true);
    this.twoFaFeedbackKey.set(null);
    this.errorMessage.set(null);

    if (this.disableForm.invalid) {
      this.disableForm.markAllAsTouched();
      return;
    }

    const { password, code } = this.disableForm.getRawValue();
    this.twoFaLoading.set(true);

    this.#authService
      .disableTwoFactor({ password, code })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.twoFaLoading.set(false);
          this.disableForm.reset();
          this.disableSubmitted.set(false);
          this.twoFaFeedbackKey.set('PROFILE.SUCCESS_2FA_DISABLED');
        },
        error: (error: HttpErrorResponse) => {
          this.twoFaLoading.set(false);
          this.errorMessage.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }

  #patchProfileForm(username: string, fullName: string, email: string): void {
    this.profileForm.patchValue({ username, fullName, email });
  }
}
