import { HttpErrorResponse } from '@angular/common/http';
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
import { TranslatePipe } from '@ngx-translate/core';
import { MINISTRY_STATUSES, MinistryStatus } from '@enums/ministry-status';
import { ICreateMinistry } from '@interfaces/ICreateMinistry';
import { IMember } from '@interfaces/IMember';
import { IUpdateMinistry } from '@interfaces/IUpdateMinistry';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { MembersService } from '@services/members-service';
import { MinistriesService } from '@services/ministries-service';

@Component({
  selector: 'app-ministry-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './ministry-form.html',
  styleUrl: './ministry-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MinistryForm implements OnInit {
  readonly #ministriesService = inject(MinistriesService);
  readonly #membersService = inject(MembersService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly ministryId = input<string | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly statuses = MINISTRY_STATUSES;
  readonly leaderOptions = signal<IMember[]>([]);
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
      validators: [Validators.required, Validators.minLength(1), Validators.maxLength(120)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
    leaderMemberId: new FormControl('', { nonNullable: true }),
    status: new FormControl<MinistryStatus>(MinistryStatus.ACTIVE, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    this.#loadLeaderOptions();

    const id = this.ministryId();
    if (id) {
      this.isEditMode.set(true);
      this.#loadMinistry(id);
    }
  }

  statusLabelKey(status: MinistryStatus): string {
    return `MINISTRIES.STATUS_${status.toUpperCase()}`;
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

  #loadLeaderOptions(): void {
    if (!this.#auth.hasPermission('members:read')) {
      return;
    }

    this.#membersService
      .list({ page: 1, limit: 100, status: undefined })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.leaderOptions.set(response.data),
        error: () => this.leaderOptions.set([]),
      });
  }

  #loadMinistry(id: string): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.#ministriesService
      .getById(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (ministry) => {
          this.form.patchValue({
            name: ministry.name,
            description: ministry.description ?? '',
            leaderMemberId: ministry.leaderMemberId ?? '',
            status: ministry.status,
          });
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
          this.feedbackKey.set('MINISTRIES.LOAD_ERROR');
        },
      });
  }

  #submitCreate(): void {
    const body = this.#buildPayload();
    this.saving.set(true);

    this.#ministriesService
      .create(body)
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
    const id = this.ministryId();
    if (!id) {
      return;
    }

    const body = this.#buildUpdatePayload();
    this.saving.set(true);

    this.#ministriesService
      .update(id, body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.feedbackKey.set('MINISTRIES.SAVE_SUCCESS');
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.#applySaveError(error);
        },
      });
  }

  #buildPayload(): ICreateMinistry {
    const raw = this.form.getRawValue();
    const payload: ICreateMinistry = {
      name: raw.name.trim(),
      status: raw.status,
    };

    const description = raw.description.trim();
    if (description) {
      payload.description = description;
    }

    const leaderMemberId = raw.leaderMemberId.trim();
    if (leaderMemberId) {
      payload.leaderMemberId = leaderMemberId;
    }

    return payload;
  }

  #buildUpdatePayload(): IUpdateMinistry {
    const raw = this.form.getRawValue();
    const description = raw.description.trim();
    const leaderMemberId = raw.leaderMemberId.trim();

    return {
      name: raw.name.trim(),
      status: raw.status,
      description: description || null,
      leaderMemberId: leaderMemberId || null,
    };
  }

  #applySaveError(error: HttpErrorResponse): void {
    const resolved = this.#apiError.resolve(error);
    this.feedbackKey.set(null);
    this.errorMessage.set(resolved.displayMessage);
    this.supportHint.set(resolved.supportHint ?? null);
  }
}
