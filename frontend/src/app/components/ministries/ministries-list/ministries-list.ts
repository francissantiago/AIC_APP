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
import { MinistryForm } from '@components/ministries/ministry-form/ministry-form';
import { MinistryMembersPanel } from '@components/ministries/ministry-members-panel/ministry-members-panel';
import { TranslatePipe } from '@ngx-translate/core';
import { MINISTRY_STATUSES, MinistryStatus } from '@enums/ministry-status';
import { IMinistry } from '@interfaces/IMinistry';
import { AuthService } from '@services/auth-service';
import { MinistriesService } from '@services/ministries-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-ministries-list',
  imports: [AppDialog, MinistryForm, MinistryMembersPanel, ReactiveFormsModule, TranslatePipe],
  templateUrl: './ministries-list.html',
  styleUrl: './ministries-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MinistriesList implements OnInit {
  readonly #ministriesService = inject(MinistriesService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);

  readonly statuses = MINISTRY_STATUSES;

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
  readonly managingMembersId = signal<string | null>(null);

  readonly totalPages = computed(() => {
    const pages = Math.ceil(this.total() / this.limit());
    return pages > 0 ? pages : 1;
  });

  readonly canWrite = computed(() => this.#auth.hasPermission('ministries:write'));

  readonly filterForm = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    status: new FormControl<MinistryStatus | ''>('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadMinistries();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, next) => prev.q === next.q && prev.status === next.status),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.#loadMinistries();
      });
  }

  statusLabelKey(status: MinistryStatus): string {
    return `MINISTRIES.STATUS_${status.toUpperCase()}`;
  }

  openCreate(): void {
    this.editingId.set(null);
    this.pendingDeleteId.set(null);
    this.managingMembersId.set(null);
    this.showForm.set(true);
  }

  openEdit(id: string): void {
    this.editingId.set(id);
    this.pendingDeleteId.set(null);
    this.managingMembersId.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  afterSave(): void {
    this.closeForm();
    this.feedback.set('MINISTRIES.SAVE_SUCCESS');
    this.#loadMinistries();
  }

  openMembers(id: string): void {
    this.showForm.set(false);
    this.pendingDeleteId.set(null);
    this.managingMembersId.set(id);
  }

  closeMembers(): void {
    this.managingMembersId.set(null);
  }

  previousPage(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.update((value) => value - 1);
    this.#loadMinistries();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    this.page.update((value) => value + 1);
    this.#loadMinistries();
  }

  askDelete(ministryId: string): void {
    this.closeForm();
    this.managingMembersId.set(null);
    this.pendingDeleteId.set(ministryId);
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

    this.#ministriesService
      .remove(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteId.set(null);
          this.feedback.set('MINISTRIES.DELETE_SUCCESS');
          this.#loadMinistries();
        },
        error: () => {
          this.deleting.set(false);
          this.feedback.set('MINISTRIES.DELETE_ERROR');
        },
      });
  }

  #loadMinistries(): void {
    this.loading.set(true);
    this.error.set(false);

    const { q, status } = this.filterForm.getRawValue();

    this.#ministriesService
      .list({
        page: this.page(),
        limit: this.limit(),
        q: q.trim() || undefined,
        status: status || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.ministries.set(response.data);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
          this.loading.set(false);
        },
        error: () => {
          this.ministries.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
