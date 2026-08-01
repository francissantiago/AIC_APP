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
import { TimeInput } from '@components/time-input/time-input';
import { SocialProjectExpensesList } from '@components/social-projects/social-project-expenses-list/social-project-expenses-list';
import { TranslatePipe } from '@ngx-translate/core';
import { SOCIAL_PROJECT_CATEGORIES, SocialProjectCategory } from '@enums/social-project-category';
import { SOCIAL_PROJECT_STATUSES, SocialProjectStatus } from '@enums/social-project-status';
import { ICreateSocialProject, IUpdateSocialProject } from '@interfaces/ISocialProjectQuery';
import { IMember } from '@interfaces/IMember';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { MembersService } from '@services/members-service';
import { SocialProjectsService } from '@services/social-projects-service';

type ProjectFormTab = 'details' | 'expenses';

const DAY_OF_WEEK_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;

const DAY_LABEL_KEYS: Record<(typeof DAY_OF_WEEK_VALUES)[number], string> = {
  0: 'SOCIAL_PROJECTS.DAY_NOT_SET',
  1: 'SOCIAL_PROJECTS.DAY_MONDAY',
  2: 'SOCIAL_PROJECTS.DAY_TUESDAY',
  3: 'SOCIAL_PROJECTS.DAY_WEDNESDAY',
  4: 'SOCIAL_PROJECTS.DAY_THURSDAY',
  5: 'SOCIAL_PROJECTS.DAY_FRIDAY',
  6: 'SOCIAL_PROJECTS.DAY_SATURDAY',
};

@Component({
  selector: 'app-social-project-form',
  imports: [ReactiveFormsModule, SocialProjectExpensesList, TimeInput, TranslatePipe],
  templateUrl: './social-project-form.html',
  styleUrl: './social-project-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialProjectForm implements OnInit {
  readonly #projectsService = inject(SocialProjectsService);
  readonly #membersService = inject(MembersService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly projectId = input<string | null>(null);
  readonly saved = output<void>();
  readonly created = output<void>();
  readonly cancelled = output<void>();

  readonly statuses = SOCIAL_PROJECT_STATUSES;
  readonly categories = SOCIAL_PROJECT_CATEGORIES;
  readonly daysOfWeek = DAY_OF_WEEK_VALUES;
  readonly leaderOptions = signal<IMember[]>([]);
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

  readonly canAccessExpensesTab = computed(() => this.resolvedProjectId() !== null);

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1), Validators.maxLength(120)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
    category: new FormControl<SocialProjectCategory>(SocialProjectCategory.OTHER, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    leaderMemberId: new FormControl('', { nonNullable: true }),
    dayOfWeek: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(6)],
    }),
    startTime: new FormControl('', { nonNullable: true }),
    location: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
    budgetAmount: new FormControl<number | null>(null),
    status: new FormControl<SocialProjectStatus>(SocialProjectStatus.ACTIVE, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    this.#loadLeaderOptions();

    const id = this.projectId();
    if (id) {
      this.isEditMode.set(true);
      this.resolvedProjectId.set(id);
      this.#loadProject(id);
    }
  }

  statusLabelKey(status: SocialProjectStatus): string {
    return `SOCIAL_PROJECTS.STATUS_${status.toUpperCase()}`;
  }

  categoryLabelKey(category: SocialProjectCategory): string {
    return `SOCIAL_PROJECTS.CATEGORY_${category.toUpperCase()}`;
  }

  dayLabelKey(dayOfWeek: number): string {
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return DAY_LABEL_KEYS[0];
    }
    return DAY_LABEL_KEYS[dayOfWeek as (typeof DAY_OF_WEEK_VALUES)[number]];
  }

  setTab(tab: ProjectFormTab): void {
    if (tab === 'expenses' && !this.canAccessExpensesTab()) {
      return;
    }
    this.activeTab.set(tab);
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

  #loadLeaderOptions(): void {
    if (!this.#auth.hasPermission('members:read')) {
      return;
    }

    this.#membersService
      .list({ page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.leaderOptions.set(response.data),
        error: () => this.leaderOptions.set([]),
      });
  }

  #loadProject(id: string): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.#projectsService
      .getById(id, {
        includeMembersCount: true,
        includeSessionsCount: true,
        includeExpensesCount: true,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (project) => {
          this.form.patchValue({
            name: project.name,
            description: project.description ?? '',
            category: project.category,
            leaderMemberId: project.leaderMemberId ?? '',
            dayOfWeek: project.dayOfWeek,
            startTime: project.startTime ? project.startTime.slice(0, 5) : '',
            location: project.location ?? '',
            budgetAmount: project.budgetAmount ? Number(project.budgetAmount) : null,
            status: project.status,
          });
          this.spentAmount.set(project.spentAmount);
          this.budgetUsagePercent.set(project.budgetUsagePercent);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
          this.feedbackKey.set('SOCIAL_PROJECTS.LOAD_ERROR');
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
          this.feedbackKey.set('SOCIAL_PROJECTS.SAVE_SUCCESS');
          this.activeTab.set('expenses');
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
          this.feedbackKey.set('SOCIAL_PROJECTS.SAVE_SUCCESS');
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.#applySaveError(error);
        },
      });
  }

  #buildCreatePayload(): ICreateSocialProject {
    const raw = this.form.getRawValue();
    const payload: ICreateSocialProject = {
      name: raw.name.trim(),
      category: raw.category,
      status: raw.status,
      dayOfWeek: Number(raw.dayOfWeek),
    };

    const description = raw.description.trim();
    const location = raw.location.trim();
    const leaderMemberId = raw.leaderMemberId.trim();
    const startTime = raw.startTime.trim();

    if (description) payload.description = description;
    if (location) payload.location = location;
    if (leaderMemberId) payload.leaderMemberId = leaderMemberId;
    if (startTime) payload.startTime = `${startTime}:00`;
    if (raw.budgetAmount != null && raw.budgetAmount > 0) {
      payload.budgetAmount = raw.budgetAmount;
    }

    return payload;
  }

  #buildUpdatePayload(): IUpdateSocialProject {
    const raw = this.form.getRawValue();
    const startTime = raw.startTime.trim();

    return {
      name: raw.name.trim(),
      description: raw.description.trim() || null,
      category: raw.category,
      leaderMemberId: raw.leaderMemberId.trim() || null,
      dayOfWeek: Number(raw.dayOfWeek),
      startTime: startTime ? `${startTime}:00` : null,
      location: raw.location.trim() || null,
      budgetAmount: raw.budgetAmount != null && raw.budgetAmount > 0 ? raw.budgetAmount : null,
      status: raw.status,
    };
  }

  #applySaveError(error: HttpErrorResponse): void {
    const resolved = this.#apiError.resolve(error);
    this.feedbackKey.set(null);
    this.errorMessage.set(resolved.displayMessage);
    this.supportHint.set(resolved.supportHint ?? null);
  }
}
