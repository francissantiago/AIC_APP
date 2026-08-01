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
import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyInput } from '@components/currency-input/currency-input';
import { DateInput } from '@components/date-input/date-input';
import { ConstructionExpensesList } from '@components/constructions/construction-expenses-list/construction-expenses-list';
import { ConstructionPhotosGallery } from '@components/constructions/construction-photos-gallery/construction-photos-gallery';
import { ConstructionProjectStagesPanel } from '@components/constructions/construction-project-stages-panel/construction-project-stages-panel';
import { TranslatePipe } from '@ngx-translate/core';
import {
  CONSTRUCTION_PROJECT_STATUSES,
  ConstructionProjectStatus,
} from '@enums/construction-project-status';
import {
  ICreateConstructionProject,
  IUpdateConstructionProject,
} from '@interfaces/IConstructionProjectQuery';
import { IMember } from '@interfaces/IMember';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { ConstructionProjectsService } from '@services/construction-projects-service';
import { MembersService } from '@services/members-service';

type ProjectFormTab = 'details' | 'stages' | 'expenses' | 'photos';

@Component({
  selector: 'app-construction-project-form',
  imports: [
    CurrencyInput,
    DateInput,
    ReactiveFormsModule,
    TranslatePipe,
    ConstructionExpensesList,
    ConstructionPhotosGallery,
    ConstructionProjectStagesPanel,
  ],
  templateUrl: './construction-project-form.html',
  styleUrl: './construction-project-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstructionProjectForm implements OnInit {
  readonly #projectsService = inject(ConstructionProjectsService);
  readonly #membersService = inject(MembersService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly projectId = input<string | null>(null);
  readonly saved = output<void>();
  readonly created = output<void>();
  readonly cancelled = output<void>();
  readonly stagesChanged = output<void>();

  readonly statuses = CONSTRUCTION_PROJECT_STATUSES;
  readonly supervisorOptions = signal<IMember[]>([]);
  readonly activeTab = signal<ProjectFormTab>('details');
  readonly resolvedProjectId = signal<string | null>(null);
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal(false);
  readonly feedbackKey = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);
  readonly spentAmount = signal<string | null>(null);
  readonly budgetUsagePercent = signal<number | null>(null);
  readonly progressPercent = signal(0);

  readonly canAccessSubTabs = computed(() => this.resolvedProjectId() !== null);

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1), Validators.maxLength(120)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
    location: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
    status: new FormControl<ConstructionProjectStatus>(ConstructionProjectStatus.PLANNING, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    budgetAmount: new FormControl<number | null>(null),
    startDate: new FormControl('', { nonNullable: true }),
    expectedEndDate: new FormControl('', { nonNullable: true }),
    actualEndDate: new FormControl('', { nonNullable: true }),
    supervisorMemberId: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadSupervisorOptions();

    const id = this.projectId();
    if (id) {
      this.isEditMode.set(true);
      this.resolvedProjectId.set(id);
      this.#loadProject(id);
    }
  }

  statusLabelKey(status: ConstructionProjectStatus): string {
    return `CONSTRUCTIONS.STATUS_${status.toUpperCase()}`;
  }

  setTab(tab: ProjectFormTab): void {
    if (tab !== 'details' && !this.canAccessSubTabs()) {
      return;
    }
    this.activeTab.set(tab);
  }

  onStagesChanged(): void {
    const id = this.resolvedProjectId();
    if (id) {
      this.#loadProject(id, { silent: true });
    }
    this.stagesChanged.emit();
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
      this.activeTab.set('details');
      return;
    }

    if (this.isEditMode()) {
      this.#submitEdit();
      return;
    }

    this.#submitCreate();
  }

  #loadSupervisorOptions(): void {
    if (!this.#auth.hasPermission('members:read')) {
      return;
    }

    this.#membersService
      .list({ page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.supervisorOptions.set(response.data),
        error: () => this.supervisorOptions.set([]),
      });
  }

  #loadProject(id: string, options?: { silent?: boolean }): void {
    if (!options?.silent) {
      this.loading.set(true);
      this.loadError.set(false);
    }

    this.#projectsService
      .getById(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (project) => {
          this.form.patchValue({
            name: project.name,
            description: project.description ?? '',
            location: project.location ?? '',
            status: project.status,
            budgetAmount: project.budgetAmount ? Number(project.budgetAmount) : null,
            startDate: project.startDate ?? '',
            expectedEndDate: project.expectedEndDate ?? '',
            actualEndDate: project.actualEndDate ?? '',
            supervisorMemberId: project.supervisorMemberId ?? '',
          });
          this.spentAmount.set(project.spentAmount);
          this.budgetUsagePercent.set(project.budgetUsagePercent);
          this.progressPercent.set(project.progressPercent);
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
    this.#projectsService
      .create(this.#buildCreatePayload())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (project) => {
          this.saving.set(false);
          this.isEditMode.set(true);
          this.resolvedProjectId.set(project.id);
          this.spentAmount.set(project.spentAmount);
          this.budgetUsagePercent.set(project.budgetUsagePercent);
          this.progressPercent.set(project.progressPercent);
          this.feedbackKey.set('CONSTRUCTIONS.SAVE_SUCCESS');
          this.activeTab.set('stages');
          this.created.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.#applySaveError(error);
        },
      });
  }

  #submitEdit(): void {
    const id = this.resolvedProjectId();
    if (!id) {
      return;
    }

    this.saving.set(true);
    this.#projectsService
      .update(id, this.#buildUpdatePayload())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (project) => {
          this.saving.set(false);
          this.spentAmount.set(project.spentAmount);
          this.budgetUsagePercent.set(project.budgetUsagePercent);
          this.progressPercent.set(project.progressPercent);
          this.feedbackKey.set('CONSTRUCTIONS.SAVE_SUCCESS');
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.#applySaveError(error);
        },
      });
  }

  #buildCreatePayload(): ICreateConstructionProject {
    const raw = this.form.getRawValue();
    const payload: ICreateConstructionProject = {
      name: raw.name.trim(),
      status: raw.status,
    };

    const description = raw.description.trim();
    const location = raw.location.trim();
    const supervisorMemberId = raw.supervisorMemberId.trim();
    if (description) payload.description = description;
    if (location) payload.location = location;
    if (raw.budgetAmount != null && raw.budgetAmount > 0) payload.budgetAmount = raw.budgetAmount;
    if (raw.startDate) payload.startDate = raw.startDate;
    if (raw.expectedEndDate) payload.expectedEndDate = raw.expectedEndDate;
    if (raw.actualEndDate) payload.actualEndDate = raw.actualEndDate;
    if (supervisorMemberId) payload.supervisorMemberId = supervisorMemberId;

    return payload;
  }

  #buildUpdatePayload(): IUpdateConstructionProject {
    const raw = this.form.getRawValue();
    return {
      name: raw.name.trim(),
      description: raw.description.trim() || null,
      location: raw.location.trim() || null,
      status: raw.status,
      budgetAmount: raw.budgetAmount != null && raw.budgetAmount > 0 ? raw.budgetAmount : null,
      startDate: raw.startDate || null,
      expectedEndDate: raw.expectedEndDate || null,
      actualEndDate: raw.actualEndDate || null,
      supervisorMemberId: raw.supervisorMemberId.trim() || null,
    };
  }

  #applySaveError(error: HttpErrorResponse): void {
    const resolved = this.#apiError.resolve(error);
    this.feedbackKey.set(null);
    this.errorMessage.set(resolved.displayMessage);
    this.supportHint.set(resolved.supportHint ?? null);
  }
}
