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
import { ConstructionUpdateForm } from '@components/constructions/construction-update-form/construction-update-form';
import { TranslatePipe } from '@ngx-translate/core';
import { IConstructionProject } from '@interfaces/IConstructionProject';
import { IConstructionUpdate } from '@interfaces/IConstructionUpdate';
import { AuthService } from '@services/auth-service';
import { ConstructionProjectsService } from '@services/construction-projects-service';
import { ConstructionUpdatesService } from '@services/construction-updates-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AppDatePipe } from '@pipes/app-date-pipe';

interface HistoryContext {
  projectId: string;
  projectName: string;
}

@Component({
  selector: 'app-construction-updates-list',
  imports: [AppDatePipe, AppDialog, ConstructionUpdateForm, ReactiveFormsModule, TranslatePipe],
  templateUrl: './construction-updates-list.html',
  styleUrl: './construction-updates-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstructionUpdatesList implements OnInit {
  readonly #updatesService = inject(ConstructionUpdatesService);
  readonly #projectsService = inject(ConstructionProjectsService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);

  readonly updates = signal<IConstructionUpdate[]>([]);
  readonly projects = signal<IConstructionProject[]>([]);
  readonly historyItems = signal<IConstructionUpdate[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly loading = signal(false);
  readonly historyLoading = signal(false);
  readonly error = signal(false);
  readonly historyError = signal(false);
  readonly deleting = signal(false);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly showHistory = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly historyContext = signal<HistoryContext | null>(null);

  readonly totalPages = computed(() => {
    const pages = Math.ceil(this.total() / this.limit());
    return pages > 0 ? pages : 1;
  });

  readonly canWrite = computed(() => this.#auth.hasPermission('constructions:write'));

  readonly filterForm = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    constructionProjectId: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadProjects();
    this.#loadUpdates();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (prev, next) =>
            prev.q === next.q && prev.constructionProjectId === next.constructionProjectId,
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.#loadUpdates();
      });
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

  openHistory(update: IConstructionUpdate): void {
    const projectId = update.constructionProjectId;
    const projectName = update.projectName ?? '—';
    this.historyContext.set({ projectId, projectName });
    this.showHistory.set(true);
    this.historyLoading.set(true);
    this.historyError.set(false);
    this.historyItems.set([]);

    this.#updatesService
      .listHistory(projectId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (items) => {
          this.historyItems.set(items);
          this.historyLoading.set(false);
        },
        error: () => {
          this.historyItems.set([]);
          this.historyLoading.set(false);
          this.historyError.set(true);
        },
      });
  }

  closeHistory(): void {
    this.showHistory.set(false);
    this.historyContext.set(null);
    this.historyItems.set([]);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  afterSave(): void {
    this.closeForm();
    this.feedback.set('CONSTRUCTIONS.SAVE_SUCCESS');
    this.#loadUpdates();
  }

  previousPage(): void {
    if (this.page() <= 1) return;
    this.page.update((value) => value - 1);
    this.#loadUpdates();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((value) => value + 1);
    this.#loadUpdates();
  }

  askDelete(updateId: string): void {
    this.closeForm();
    this.pendingDeleteId.set(updateId);
    this.feedback.set(null);
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  confirmDelete(): void {
    const id = this.pendingDeleteId();
    if (!id) return;

    this.deleting.set(true);
    this.#updatesService
      .remove(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteId.set(null);
          this.feedback.set('CONSTRUCTIONS.DELETE_SUCCESS');
          this.#loadUpdates();
        },
        error: () => {
          this.deleting.set(false);
          this.feedback.set('CONSTRUCTIONS.DELETE_ERROR');
        },
      });
  }

  displayProgress(update: IConstructionUpdate): number {
    return update.progressPercent ?? update.projectProgressPercent ?? 0;
  }

  observationText(update: IConstructionUpdate): string {
    const text = update.description?.trim();
    return text ? text : '—';
  }

  #loadProjects(): void {
    this.#projectsService
      .list({ page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.projects.set(response.data),
        error: () => this.projects.set([]),
      });
  }

  #loadUpdates(): void {
    this.loading.set(true);
    this.error.set(false);
    const { q, constructionProjectId } = this.filterForm.getRawValue();

    this.#updatesService
      .list({
        page: this.page(),
        limit: this.limit(),
        q: q.trim() || undefined,
        constructionProjectId: constructionProjectId.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.updates.set(response.data);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
          this.loading.set(false);
        },
        error: () => {
          this.updates.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
