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
import { CongregationBranchForm } from '@components/congregations/congregation-branch-form/congregation-branch-form';
import { TranslatePipe } from '@ngx-translate/core';
import { CONGREGATION_STATUSES, CongregationStatus } from '@enums/congregation-status';
import { CONGREGATION_TYPES, CongregationType } from '@enums/congregation-type';
import { ICongregation } from '@interfaces/ICongregation';
import { AuthService } from '@services/auth-service';
import { CongregationsService } from '@services/congregations-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-congregations-list',
  imports: [AppDialog, CongregationBranchForm, ReactiveFormsModule, TranslatePipe],
  templateUrl: './congregations-list.html',
  styleUrl: './congregations-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CongregationsList implements OnInit {
  readonly #congregationsService = inject(CongregationsService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);

  readonly statuses = CONGREGATION_STATUSES;
  readonly types = CONGREGATION_TYPES;

  readonly congregations = signal<ICongregation[]>([]);
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

  readonly canWrite = computed(() => this.#auth.hasPermission('congregations:write'));
  readonly canManageBranches = computed(() =>
    this.#auth.hasPermission('congregations:manage_branches'),
  );

  readonly filterForm = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    type: new FormControl<CongregationType | ''>('', { nonNullable: true }),
    status: new FormControl<CongregationStatus | ''>('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadCongregations();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (prev, next) =>
            prev.q === next.q && prev.type === next.type && prev.status === next.status,
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.#loadCongregations();
      });
  }

  statusLabelKey(status: CongregationStatus): string {
    return `CONGREGATION.STATUS_${status.toUpperCase()}`;
  }

  typeLabelKey(type: CongregationType): string {
    return `CONGREGATION.TYPE_${type.toUpperCase()}`;
  }

  locationLabel(congregation: ICongregation): string {
    const parts = [congregation.city, congregation.state].filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : '—';
  }

  branchesLabel(congregation: ICongregation): string {
    if (congregation.type !== CongregationType.HEADQUARTERS) {
      return '—';
    }
    return String(congregation.branchesCount ?? 0);
  }

  canDelete(congregation: ICongregation): boolean {
    return this.canManageBranches() && congregation.type !== CongregationType.HEADQUARTERS;
  }

  isHeadquarters(congregation: ICongregation): boolean {
    return congregation.type === CongregationType.HEADQUARTERS;
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

  afterSave(isCreate: boolean): void {
    this.closeForm();
    this.feedback.set(isCreate ? 'CONGREGATIONS.CREATE_SUCCESS' : 'CONGREGATIONS.SAVE_SUCCESS');
    this.#loadCongregations();
  }

  previousPage(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.update((value) => value - 1);
    this.#loadCongregations();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    this.page.update((value) => value + 1);
    this.#loadCongregations();
  }

  askDelete(congregationId: string): void {
    this.closeForm();
    this.pendingDeleteId.set(congregationId);
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
    this.error.set(false);

    this.#congregationsService
      .remove(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteId.set(null);
          this.feedback.set('CONGREGATIONS.DELETE_SUCCESS');
          this.#loadCongregations();
        },
        error: () => {
          this.deleting.set(false);
          this.feedback.set('CONGREGATIONS.LOAD_ERROR');
        },
      });
  }

  #loadCongregations(): void {
    this.loading.set(true);
    this.error.set(false);

    const { q, type, status } = this.filterForm.getRawValue();

    this.#congregationsService
      .findAll({
        page: this.page(),
        limit: this.limit(),
        q: q.trim() || undefined,
        type: type || undefined,
        status: status || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.congregations.set(response.data);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
          this.loading.set(false);
        },
        error: () => {
          this.congregations.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
