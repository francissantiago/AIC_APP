import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  ICreateSocialProjectSession,
  ISocialProjectSession,
  IUpdateSocialProjectSession,
} from '@interfaces/ISocialProjectSession';
import { ApiErrorService } from '@services/api-error.service';
import { SocialProjectSessionsService } from '@services/social-project-sessions-service';

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-social-project-session-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './social-project-session-form.html',
  styleUrl: './social-project-session-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialProjectSessionForm {
  readonly #sessionsService = inject(SocialProjectSessionsService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly projectId = input.required<string>();
  readonly session = input<ISocialProjectSession | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);

  readonly form = new FormGroup({
    sessionDate: new FormControl(todayIsoDate(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1), Validators.maxLength(120)],
    }),
    theme: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
    notes: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
    location: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
  });

  constructor() {
    effect(() => {
      const current = this.session();
      if (current) {
        this.form.reset({
          sessionDate: current.sessionDate,
          title: current.title,
          theme: current.theme ?? '',
          notes: current.notes ?? '',
          location: current.location ?? '',
        });
        return;
      }

      this.form.reset({
        sessionDate: todayIsoDate(),
        title: '',
        theme: '',
        notes: '',
        location: '',
      });
    });
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

    const editing = this.session();
    this.saving.set(true);

    if (editing) {
      this.#sessionsService
        .update(this.projectId(), editing.id, this.#buildUpdatePayload())
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.saved.emit();
          },
          error: (error: HttpErrorResponse) => this.#applyError(error),
        });
      return;
    }

    this.#sessionsService
      .create(this.projectId(), this.#buildCreatePayload())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) => this.#applyError(error),
      });
  }

  #buildCreatePayload(): ICreateSocialProjectSession {
    const raw = this.form.getRawValue();
    const payload: ICreateSocialProjectSession = {
      sessionDate: raw.sessionDate,
      title: raw.title.trim(),
    };

    const theme = raw.theme.trim();
    const notes = raw.notes.trim();
    const location = raw.location.trim();
    if (theme) payload.theme = theme;
    if (notes) payload.notes = notes;
    if (location) payload.location = location;

    return payload;
  }

  #buildUpdatePayload(): IUpdateSocialProjectSession {
    const raw = this.form.getRawValue();
    return {
      sessionDate: raw.sessionDate,
      title: raw.title.trim(),
      theme: raw.theme.trim() || null,
      notes: raw.notes.trim() || null,
      location: raw.location.trim() || null,
    };
  }

  #applyError(error: HttpErrorResponse): void {
    this.saving.set(false);
    const resolved = this.#apiError.resolve(error);
    this.errorMessage.set(resolved.displayMessage);
    this.supportHint.set(resolved.supportHint ?? null);
  }
}
