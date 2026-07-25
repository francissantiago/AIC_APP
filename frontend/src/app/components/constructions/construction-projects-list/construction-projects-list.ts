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
import { ConstructionProjectForm } from '@components/constructions/construction-project-form/construction-project-form';
import { TranslatePipe } from '@ngx-translate/core';
import {
  CONSTRUCTION_PROJECT_STATUSES,
  ConstructionProjectStatus,
} from '@enums/construction-project-status';
import { IConstructionProject } from '@interfaces/IConstructionProject';
import { IMinistry } from '@interfaces/IMinistry';
import { AuthService } from '@services/auth-service';
import { ConstructionProjectsService } from '@services/construction-projects-service';
import { MinistriesService } from '@services/ministries-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-construction-projects-list',
  imports: [AppDialog, ConstructionProjectForm, ReactiveFormsModule, TranslatePipe],
  templateUrl: './construction-projects-list.html',
  styleUrl: './construction-projects-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstructionProjectsList implements OnInit {
  readonly #projectsService = inject(ConstructionProjectsService);
  readonly #ministriesService = inject(MinistriesService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);

  readonly statuses = CONSTRUCTION_PROJECT_STATUSES;
  readonly projects = signal<IConstructionProject[]>([]);
  readonly ministries = signal<IMinistry[]>([]);
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

  readonly totalPages = computed(() => {
    const pages = Math.ceil(this.total() / this.limit());
    return pages > 0 ? pages : 1;
  });

  readonly canWrite = computed(() => this.#auth.hasPermission('constructions:write'));

  readonly filterForm = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    status: new FormControl<ConstructionProjectStatus | ''>('', { nonNullable: true }),
    ministryId: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadMinistries();
    this.#loadProjects();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (prev, next) =>
            prev.q === next.q && prev.status === next.status && prev.ministryId === next.ministryId,
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.#loadProjects();
      });
  }

  statusLabelKey(status: ConstructionProjectStatus): string {
    return `CONSTRUCTIONS.STATUS_${status.toUpperCase()}`;
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

  openCreate(): void {
    this.editingId.set(null);
    this.pendingDeleteId.set(null);
    this.showForm.set(true);
  }

  openEdit(id: string): void {
    this.editingId.set(id);
    this.pendingDeleteId.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  afterSave(): void {
    this.closeForm();
    this.feedback.set('CONSTRUCTIONS.SAVE_SUCCESS');
    this.#loadProjects();
  }

  previousPage(): void {
    if (this.page() <= 1) return;
    this.page.update((value) => value - 1);
    this.#loadProjects();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((value) => value + 1);
    this.#loadProjects();
  }

  askDelete(projectId: string): void {
    this.closeForm();
    this.pendingDeleteId.set(projectId);
    this.feedback.set(null);
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  confirmDelete(): void {
    const id = this.pendingDeleteId();
    if (!id) return;

    this.deleting.set(true);
    this.#projectsService
      .remove(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteId.set(null);
          this.feedback.set('CONSTRUCTIONS.DELETE_SUCCESS');
          this.#loadProjects();
        },
        error: () => {
          this.deleting.set(false);
          this.feedback.set('CONSTRUCTIONS.DELETE_ERROR');
        },
      });
  }

  #loadMinistries(): void {
    if (!this.#auth.hasPermission('ministries:read')) {
      return;
    }

    this.#ministriesService
      .list({ page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.ministries.set(response.data),
        error: () => this.ministries.set([]),
      });
  }

  #loadProjects(): void {
    this.loading.set(true);
    this.error.set(false);
    const { q, status, ministryId } = this.filterForm.getRawValue();

    this.#projectsService
      .list({
        page: this.page(),
        limit: this.limit(),
        q: q.trim() || undefined,
        status: status || undefined,
        ministryId: ministryId.trim() || undefined,
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
