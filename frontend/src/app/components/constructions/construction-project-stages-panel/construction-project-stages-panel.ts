import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { IConstructionProjectStage } from '@interfaces/IConstructionProjectStage';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { ConstructionProjectsService } from '@services/construction-projects-service';

interface PendingStageChange {
  stageId: string;
  stageTitle: string;
  completed: boolean;
}

@Component({
  selector: 'app-construction-project-stages-panel',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './construction-project-stages-panel.html',
  styleUrl: './construction-project-stages-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstructionProjectStagesPanel implements OnInit {
  readonly #projectsService = inject(ConstructionProjectsService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly projectId = input.required<string>();
  readonly changed = output<void>();

  readonly stages = signal<IConstructionProjectStage[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly feedbackKey = signal<string | null>(null);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly pendingStageChange = signal<PendingStageChange | null>(null);

  readonly canWrite = computed(() => this.#auth.hasPermission('constructions:write'));

  readonly progressPercent = computed(() => {
    const list = this.stages();
    if (list.length === 0) {
      return 0;
    }
    const completed = list.filter((stage) => stage.completedAt != null).length;
    return Math.round((completed / list.length) * 100);
  });

  readonly stageChangeForm = new FormGroup({
    observation: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
  });

  readonly addForm = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
  });

  ngOnInit(): void {
    this.#loadStages();
  }

  isCompleted(stage: IConstructionProjectStage): boolean {
    return stage.completedAt != null;
  }

  toggleCompleted(stage: IConstructionProjectStage, event: Event): void {
    if (!this.canWrite()) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const targetCompleted = input.checked;
    const currentCompleted = this.isCompleted(stage);
    if (targetCompleted === currentCompleted) {
      return;
    }

    input.checked = currentCompleted;
    this.stageChangeForm.reset({ observation: '' });
    this.pendingStageChange.set({
      stageId: stage.id,
      stageTitle: stage.title,
      completed: targetCompleted,
    });
  }

  cancelStageChange(): void {
    this.pendingStageChange.set(null);
    this.stageChangeForm.reset({ observation: '' });
  }

  confirmStageChange(): void {
    const pending = this.pendingStageChange();
    if (!pending || !this.canWrite()) {
      return;
    }

    const observation = this.stageChangeForm.controls.observation.value.trim();
    this.saving.set(true);
    this.errorMessage.set(null);

    this.#projectsService
      .updateStage(this.projectId(), pending.stageId, {
        completed: pending.completed,
        observation: observation || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.pendingStageChange.set(null);
          this.stageChangeForm.reset({ observation: '' });
          this.stages.update((list) =>
            list.map((item) => (item.id === updated.id ? updated : item)),
          );
          this.changed.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.errorMessage.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }

  submitAdd(): void {
    if (!this.canWrite() || this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    const title = this.addForm.controls.title.value.trim();
    this.saving.set(true);
    this.errorMessage.set(null);

    this.#projectsService
      .createStage(this.projectId(), { title })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.addForm.reset({ title: '' });
          this.feedbackKey.set('CONSTRUCTIONS.STAGE_ADD_SUCCESS');
          this.#loadStages();
          this.changed.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.errorMessage.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }

  askDelete(stageId: string): void {
    this.pendingDeleteId.set(stageId);
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  confirmDelete(): void {
    const stageId = this.pendingDeleteId();
    if (!stageId || !this.canWrite()) {
      return;
    }

    this.saving.set(true);
    this.#projectsService
      .removeStage(this.projectId(), stageId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.pendingDeleteId.set(null);
          this.feedbackKey.set('CONSTRUCTIONS.STAGE_DELETE_SUCCESS');
          this.#loadStages();
          this.changed.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.errorMessage.set(this.#apiError.resolve(error).displayMessage);
        },
      });
  }

  #loadStages(): void {
    this.loading.set(true);
    this.error.set(false);

    this.#projectsService
      .listStages(this.projectId())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (stages) => {
          this.stages.set(stages);
          this.loading.set(false);
        },
        error: () => {
          this.stages.set([]);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
