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
import { RouterLink } from '@angular/router';
import { AppDialog } from '@components/app-dialog/app-dialog';
import { SmallGroupForm } from '@components/small-groups/small-group-form/small-group-form';
import { SmallGroupMeetingsPanel } from '@components/small-groups/small-group-meetings-panel/small-group-meetings-panel';
import { SmallGroupMembersPanel } from '@components/small-groups/small-group-members-panel/small-group-members-panel';
import { TranslatePipe } from '@ngx-translate/core';
import { SMALL_GROUP_STATUSES, SmallGroupStatus } from '@enums/small-group-status';
import { ISmallGroup } from '@interfaces/ISmallGroup';
import { AuthService } from '@services/auth-service';
import { SmallGroupsService } from '@services/small-groups-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

const DAY_OF_WEEK_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;

const DAY_LABEL_KEYS: Record<(typeof DAY_OF_WEEK_VALUES)[number], string> = {
  0: 'SMALL_GROUPS.DAY_SUNDAY',
  1: 'SMALL_GROUPS.DAY_MONDAY',
  2: 'SMALL_GROUPS.DAY_TUESDAY',
  3: 'SMALL_GROUPS.DAY_WEDNESDAY',
  4: 'SMALL_GROUPS.DAY_THURSDAY',
  5: 'SMALL_GROUPS.DAY_FRIDAY',
  6: 'SMALL_GROUPS.DAY_SATURDAY',
};

@Component({
  selector: 'app-small-groups-list',
  imports: [
    AppDialog,
    ReactiveFormsModule,
    RouterLink,
    SmallGroupForm,
    SmallGroupMeetingsPanel,
    SmallGroupMembersPanel,
    TranslatePipe,
  ],
  templateUrl: './small-groups-list.html',
  styleUrl: './small-groups-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmallGroupsList implements OnInit {
  readonly #smallGroupsService = inject(SmallGroupsService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);

  readonly statuses = SMALL_GROUP_STATUSES;

  readonly groups = signal<ISmallGroup[]>([]);
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
  readonly managingMeetingsId = signal<string | null>(null);

  readonly totalPages = computed(() => {
    const pages = Math.ceil(this.total() / this.limit());
    return pages > 0 ? pages : 1;
  });

  readonly canWrite = computed(() => this.#auth.hasPermission('small-groups:write'));

  readonly filterForm = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    status: new FormControl<SmallGroupStatus | ''>('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadGroups();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, next) => prev.q === next.q && prev.status === next.status),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.#loadGroups();
      });
  }

  statusLabelKey(status: SmallGroupStatus): string {
    return `SMALL_GROUPS.STATUS_${status.toUpperCase()}`;
  }

  dayLabelKey(dayOfWeek: number): string {
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return 'SMALL_GROUPS.DAY_SUNDAY';
    }
    return DAY_LABEL_KEYS[dayOfWeek as (typeof DAY_OF_WEEK_VALUES)[number]];
  }

  openCreate(): void {
    this.editingId.set(null);
    this.pendingDeleteId.set(null);
    this.managingMembersId.set(null);
    this.managingMeetingsId.set(null);
    this.showForm.set(true);
  }

  openEdit(id: string): void {
    this.editingId.set(id);
    this.pendingDeleteId.set(null);
    this.managingMembersId.set(null);
    this.managingMeetingsId.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  afterSave(): void {
    this.closeForm();
    this.feedback.set('SMALL_GROUPS.SAVE_SUCCESS');
    this.#loadGroups();
  }

  openMembers(id: string): void {
    this.showForm.set(false);
    this.pendingDeleteId.set(null);
    this.managingMeetingsId.set(null);
    this.managingMembersId.set(id);
  }

  closeMembers(): void {
    this.managingMembersId.set(null);
    this.#loadGroups();
  }

  openMeetings(id: string): void {
    this.showForm.set(false);
    this.pendingDeleteId.set(null);
    this.managingMembersId.set(null);
    this.managingMeetingsId.set(id);
  }

  closeMeetings(): void {
    this.managingMeetingsId.set(null);
  }

  previousPage(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.update((value) => value - 1);
    this.#loadGroups();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    this.page.update((value) => value + 1);
    this.#loadGroups();
  }

  askDelete(groupId: string): void {
    this.closeForm();
    this.managingMembersId.set(null);
    this.managingMeetingsId.set(null);
    this.pendingDeleteId.set(groupId);
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

    this.#smallGroupsService
      .remove(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteId.set(null);
          this.feedback.set('SMALL_GROUPS.DELETE_SUCCESS');
          this.#loadGroups();
        },
        error: () => {
          this.deleting.set(false);
          this.feedback.set('SMALL_GROUPS.DELETE_ERROR');
        },
      });
  }

  #loadGroups(): void {
    this.loading.set(true);
    this.error.set(false);

    const { q, status } = this.filterForm.getRawValue();

    this.#smallGroupsService
      .list({
        page: this.page(),
        limit: this.limit(),
        q: q.trim() || undefined,
        status: status || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.groups.set(response.data);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
          this.loading.set(false);
        },
        error: () => {
          this.groups.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
