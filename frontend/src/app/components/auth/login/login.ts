import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageSwitcher } from '@components/layout/language-switcher/language-switcher';
import { isTwoFactorChallenge } from '@interfaces/ILoginResult';
import { AuthService } from '@services/auth-service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, LanguageSwitcher],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  readonly #authService = inject(AuthService);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  readonly loginLoading = this.#authService.loginLoading;
  readonly loginError = this.#authService.loginError;
  readonly submitted = signal(false);
  readonly totpSubmitted = signal(false);
  readonly step = signal<'credentials' | 'totp'>('credentials');

  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly totpForm = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
    }),
  });

  fieldInvalid(controlName: 'email' | 'password'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched || this.submitted());
  }

  totpFieldInvalid(): boolean {
    const control = this.totpForm.controls.code;
    return control.invalid && (control.dirty || control.touched || this.totpSubmitted());
  }

  submit(): void {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();

    this.#authService
      .login({ email: email.trim(), password })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (result) => {
          if (isTwoFactorChallenge(result)) {
            this.step.set('totp');
            this.totpForm.reset();
            this.totpSubmitted.set(false);
            return;
          }
          void this.#router.navigateByUrl('/dashboard');
        },
        error: (_error: HttpErrorResponse) => {
          // Mensagem já mapeada em AuthService.loginError
        },
      });
  }

  submitTotp(): void {
    this.totpSubmitted.set(true);

    if (this.totpForm.invalid) {
      this.totpForm.markAllAsTouched();
      return;
    }

    const preAuthToken = this.#authService.preAuthToken();
    if (!preAuthToken) {
      this.backToCredentials();
      return;
    }

    const { code } = this.totpForm.getRawValue();

    this.#authService
      .loginTwoFactor({ preAuthToken, code })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          void this.#router.navigateByUrl('/dashboard');
        },
        error: (_error: HttpErrorResponse) => {
          // Mensagem já mapeada em AuthService.loginError
        },
      });
  }

  backToCredentials(): void {
    this.#authService.clearPreAuthChallenge();
    this.step.set('credentials');
    this.totpForm.reset();
    this.totpSubmitted.set(false);
  }
}
