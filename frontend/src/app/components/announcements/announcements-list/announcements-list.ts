import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AppDialog } from '@components/app-dialog/app-dialog';
import { AnnouncementForm } from '@components/announcements/announcement-form/announcement-form';
import { TranslatePipe } from '@ngx-translate/core';
import { AnnouncementStatus } from '@enums/announcement-status';
import { IAnnouncement } from '@interfaces/IAnnouncement';
import { AuthService } from '@services/auth-service';
import { AnnouncementsService } from '@services/announcements-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-announcements-list',
  imports: [AppDialog, AnnouncementForm, ReactiveFormsModule, TranslatePipe],
  templateUrl: './announcements-list.html',
  styleUrl: './announcements-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementsList implements OnInit {
  readonly #announcementsService = inject(AnnouncementsService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);

  readonly changed = output<void>();

  readonly announcements = signal<IAnnouncement[]>([]);
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

  readonly canWrite = computed(() => this.#auth.hasPermission('announcements:write'));

  readonly filterForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    includeExpired: new FormControl(false, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadAnnouncements();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (prev, next) =>
            prev.search === next.search && prev.includeExpired === next.includeExpired,
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.#loadAnnouncements();
      });
  }

  statusLabelKey(status: AnnouncementStatus): string {
    return `ANNOUNCEMENTS.STATUS_${status.toUpperCase()}`;
  }

  formatDate(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleString();
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
    this.feedback.set('ANNOUNCEMENTS.SAVE_SUCCESS');
    this.#loadAnnouncements();
    this.changed.emit();
  }

  previousPage(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.update((value) => value - 1);
    this.#loadAnnouncements();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    this.page.update((value) => value + 1);
    this.#loadAnnouncements();
  }

  askDelete(id: string): void {
    this.closeForm();
    this.pendingDeleteId.set(id);
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

    this.#announcementsService
      .remove(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteId.set(null);
          this.feedback.set('ANNOUNCEMENTS.DELETE_SUCCESS');
          this.#loadAnnouncements();
          this.changed.emit();
        },
        error: () => {
          this.deleting.set(false);
          this.feedback.set('ANNOUNCEMENTS.DELETE_ERROR');
        },
      });
  }

  #loadAnnouncements(): void {
    this.loading.set(true);
    this.error.set(false);

    const { search, includeExpired } = this.filterForm.getRawValue();

    this.#announcementsService
      .list({
        page: this.page(),
        limit: this.limit(),
        search: search.trim() || undefined,
        includeExpired,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.announcements.set(response.data);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
          this.loading.set(false);
        },
        error: () => {
          this.announcements.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
