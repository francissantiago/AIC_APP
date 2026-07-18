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
import { AnnouncementAudience } from '@enums/announcement-audience';
import { ICreateAnnouncement } from '@interfaces/ICreateAnnouncement';
import { IUpdateAnnouncement } from '@interfaces/IUpdateAnnouncement';
import { AnnouncementsService } from '@services/announcements-service';
import { ApiErrorService } from '@services/api-error.service';

@Component({
  selector: 'app-announcement-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './announcement-form.html',
  styleUrl: './announcement-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementForm implements OnInit {
  readonly #announcementsService = inject(AnnouncementsService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly announcementId = input<string | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal(false);
  readonly feedbackKey = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);

  readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1), Validators.maxLength(160)],
    }),
    body: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1)],
    }),
    publishedAt: new FormControl('', { nonNullable: true }),
    expiresAt: new FormControl('', { nonNullable: true }),
    audience: new FormControl(
      { value: AnnouncementAudience.ALL, disabled: true },
      { nonNullable: true },
    ),
  });

  ngOnInit(): void {
    const id = this.announcementId();
    if (id) {
      this.isEditMode.set(true);
      this.#loadAnnouncement(id);
    }
  }

  fieldInvalid(controlName: 'title' | 'body' | 'publishedAt' | 'expiresAt'): boolean {
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

  #loadAnnouncement(id: string): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.#announcementsService
      .getById(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (announcement) => {
          this.form.patchValue({
            title: announcement.title,
            body: announcement.body,
            publishedAt: this.#toDatetimeLocal(announcement.publishedAt),
            expiresAt: announcement.expiresAt ? this.#toDatetimeLocal(announcement.expiresAt) : '',
            audience: AnnouncementAudience.ALL,
          });
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
          this.feedbackKey.set('ANNOUNCEMENTS.LOAD_ERROR');
        },
      });
  }

  #submitCreate(): void {
    const body = this.#buildCreatePayload();
    this.saving.set(true);

    this.#announcementsService
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
    const id = this.announcementId();
    if (!id) {
      return;
    }

    const body = this.#buildUpdatePayload();
    this.saving.set(true);

    this.#announcementsService
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

  #buildCreatePayload(): ICreateAnnouncement {
    const raw = this.form.getRawValue();
    const payload: ICreateAnnouncement = {
      title: raw.title.trim(),
      body: raw.body.trim(),
      audience: AnnouncementAudience.ALL,
      audienceTargets: null,
    };

    const publishedAt = this.#fromDatetimeLocal(raw.publishedAt);
    if (publishedAt) {
      payload.publishedAt = publishedAt;
    }

    const expiresAt = this.#fromDatetimeLocal(raw.expiresAt);
    payload.expiresAt = expiresAt;

    return payload;
  }

  #buildUpdatePayload(): IUpdateAnnouncement {
    const raw = this.form.getRawValue();
    return {
      title: raw.title.trim(),
      body: raw.body.trim(),
      audience: AnnouncementAudience.ALL,
      audienceTargets: null,
      publishedAt: this.#fromDatetimeLocal(raw.publishedAt) ?? undefined,
      expiresAt: this.#fromDatetimeLocal(raw.expiresAt),
    };
  }

  #toDatetimeLocal(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  #fromDatetimeLocal(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  }

  #applySaveError(error: HttpErrorResponse): void {
    const resolved = this.#apiError.resolve(error);
    this.feedbackKey.set(null);
    this.errorMessage.set(resolved.displayMessage);
    this.supportHint.set(resolved.supportHint ?? null);
  }
}
