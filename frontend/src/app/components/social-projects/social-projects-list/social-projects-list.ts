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
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AppDialog } from '@components/app-dialog/app-dialog';
import { SocialProjectForm } from '@components/social-projects/social-project-form/social-project-form';
import { SocialProjectMembersPanel } from '@components/social-projects/social-project-members-panel/social-project-members-panel';
import { SocialProjectSessionsPanel } from '@components/social-projects/social-project-sessions-panel/social-project-sessions-panel';
import { TranslatePipe } from '@ngx-translate/core';
import { SOCIAL_PROJECT_CATEGORIES, SocialProjectCategory } from '@enums/social-project-category';
import { SOCIAL_PROJECT_STATUSES, SocialProjectStatus } from '@enums/social-project-status';
import { ISocialProject } from '@interfaces/ISocialProject';
import { AuthService } from '@services/auth-service';
import { SocialProjectsService } from '@services/social-projects-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

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
  selector: 'app-social-projects-list',
  imports: [
    AppDialog,
    SocialProjectForm,
    SocialProjectMembersPanel,
    SocialProjectSessionsPanel,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  templateUrl: './social-projects-list.html',
  styleUrl: './social-projects-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialProjectsList implements OnInit {
  readonly #projectsService = inject(SocialProjectsService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);

  readonly statuses = SOCIAL_PROJECT_STATUSES;
  readonly categories = SOCIAL_PROJECT_CATEGORIES;

  readonly projects = signal<ISocialProject[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly deleting = signal(false);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly managingMembersId = signal<string | null>(null);
  readonly managingSessionsId = signal<string | null>(null);

  readonly totalPages = computed(() => {
    const pages = Math.ceil(this.total() / this.limit());
    return pages > 0 ? pages : 1;
  });

  readonly canWrite = computed(() => this.#auth.hasPermission('social-projects:write'));

  readonly filterForm = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    status: new FormControl<SocialProjectStatus | ''>('', { nonNullable: true }),
    category: new FormControl<SocialProjectCategory | ''>('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadProjects();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (prev, next) =>
            prev.q === next.q && prev.status === next.status && prev.category === next.category,
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.#loadProjects();
      });
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

  formatCurrency(value: string | null): string {
    if (!value) {
      return '—';
    }
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      return value;
    }
    return amount.toLocaleString(undefined, { style: 'currency', currency: 'BRL' });
  }

  budgetSummary(project: ISocialProject): string {
    const spent = this.formatCurrency(project.spentAmount);
    if (!project.budgetAmount) {
      return spent;
    }
    const budget = this.formatCurrency(project.budgetAmount);
    const percent = project.budgetUsagePercent ?? 0;
    return `${spent} / ${budget} (${percent}%)`;
  }

  openCreate(): void {
    this.editingId.set(null);
    this.pendingDeleteId.set(null);
    this.managingMembersId.set(null);
    this.managingSessionsId.set(null);
    this.showForm.set(true);
  }

  openEdit(id: string): void {
    this.editingId.set(id);
    this.pendingDeleteId.set(null);
    this.managingMembersId.set(null);
    this.managingSessionsId.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  afterSave(): void {
    this.closeForm();
    this.feedback.set('SOCIAL_PROJECTS.SAVE_SUCCESS');
    this.#loadProjects();
  }

  refreshProjectsList(): void {
    this.#loadProjects();
  }

  openMembers(id: string): void {
    this.showForm.set(false);
    this.pendingDeleteId.set(null);
    this.managingSessionsId.set(null);
    this.managingMembersId.set(id);
  }

  closeMembers(): void {
    this.managingMembersId.set(null);
    this.#loadProjects();
  }

  onMembersPanelChanged(): void {
    this.#loadProjects();
  }

  openSessions(id: string): void {
    this.showForm.set(false);
    this.pendingDeleteId.set(null);
    this.managingMembersId.set(null);
    this.managingSessionsId.set(id);
  }

  closeSessions(): void {
    this.managingSessionsId.set(null);
  }

  previousPage(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.update((value) => value - 1);
    this.#loadProjects();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    this.page.update((value) => value + 1);
    this.#loadProjects();
  }

  askDelete(projectId: string): void {
    this.closeForm();
    this.managingMembersId.set(null);
    this.managingSessionsId.set(null);
    this.pendingDeleteId.set(projectId);
    this.feedback.set(null);
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  confirmDelete(): void {
    const id = this.pendingDeleteId();
    if (!id) {
      return;
    }

    this.deleting.set(true);
    this.#projectsService
      .remove(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteId.set(null);
          this.feedback.set('SOCIAL_PROJECTS.DELETE_SUCCESS');
          this.#loadProjects();
        },
        error: () => {
          this.deleting.set(false);
          this.feedback.set('SOCIAL_PROJECTS.DELETE_ERROR');
        },
      });
  }

  #loadProjects(): void {
    this.loading.set(true);
    this.error.set(false);

    const { q, status, category } = this.filterForm.getRawValue();

    this.#projectsService
      .list({
        page: this.page(),
        limit: this.limit(),
        q: q.trim() || undefined,
        status: status || undefined,
        category: category || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.projects.set(response.data);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
          this.loading.set(false);
        },
        error: () => {
          this.projects.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
