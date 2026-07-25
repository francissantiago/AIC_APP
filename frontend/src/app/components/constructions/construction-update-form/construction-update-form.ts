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
import {
  ICreateConstructionUpdate,
  IUpdateConstructionUpdate,
} from '@interfaces/IConstructionUpdateQuery';
import { IConstructionProject } from '@interfaces/IConstructionProject';
import { ApiErrorService } from '@services/api-error.service';
import { ConstructionProjectsService } from '@services/construction-projects-service';
import { ConstructionUpdatesService } from '@services/construction-updates-service';

@Component({
  selector: 'app-construction-update-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './construction-update-form.html',
  styleUrl: './construction-update-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstructionUpdateForm implements OnInit {
  readonly #updatesService = inject(ConstructionUpdatesService);
  readonly #projectsService = inject(ConstructionProjectsService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly updateId = input<string | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly projectOptions = signal<IConstructionProject[]>([]);
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal(false);
  readonly feedbackKey = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);

  readonly form = new FormGroup({
    constructionProjectId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    description: new FormControl('', { nonNullable: true }),
    progressPercent: new FormControl<number | null>(null, {
      validators: [Validators.min(0), Validators.max(100)],
    }),
    recordedAt: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    this.#loadProjects();
    const id = this.updateId();
    if (id) {
      this.isEditMode.set(true);
      this.#loadUpdate(id);
    } else {
      this.form.controls.recordedAt.setValue(this.#todayIsoDate());
    }
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

  #loadProjects(): void {
    this.#projectsService
      .list({ page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.projectOptions.set(response.data),
        error: () => this.projectOptions.set([]),
      });
  }

  #loadUpdate(id: string): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.#updatesService
      .getById(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (update) => {
          this.form.patchValue({
            constructionProjectId: update.constructionProjectId,
            title: update.title,
            description: update.description ?? '',
            progressPercent: update.progressPercent,
            recordedAt: update.recordedAt,
          });
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
          this.feedbackKey.set('CONSTRUCTIONS.LOAD_ERROR');
        },
      });
  }

  #submitCreate(): void {
    this.saving.set(true);
    this.#updatesService
      .create(this.#buildCreatePayload())
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
    const id = this.updateId();
    if (!id) return;

    this.saving.set(true);
    this.#updatesService
      .update(id, this.#buildUpdatePayload())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.feedbackKey.set('CONSTRUCTIONS.SAVE_SUCCESS');
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.#applySaveError(error);
        },
      });
  }

  #buildCreatePayload(): ICreateConstructionUpdate {
    const raw = this.form.getRawValue();
    const payload: ICreateConstructionUpdate = {
      constructionProjectId: raw.constructionProjectId.trim(),
      title: raw.title.trim(),
      recordedAt: raw.recordedAt,
    };
    const description = raw.description.trim();
    if (description) payload.description = description;
    if (raw.progressPercent != null) payload.progressPercent = raw.progressPercent;
    return payload;
  }

  #buildUpdatePayload(): IUpdateConstructionUpdate {
    const raw = this.form.getRawValue();
    return {
      title: raw.title.trim(),
      description: raw.description.trim() || null,
      progressPercent: raw.progressPercent,
      recordedAt: raw.recordedAt,
    };
  }

  #applySaveError(error: HttpErrorResponse): void {
    const resolved = this.#apiError.resolve(error);
    this.errorMessage.set(resolved.displayMessage);
    this.supportHint.set(resolved.supportHint ?? null);
  }

  #todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
