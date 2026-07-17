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
import { TranslatePipe } from '@ngx-translate/core';
import { MEMBER_STATUSES, MemberStatus } from '@enums/member-status';
import { IMember } from '@interfaces/IMember';
import { MembersService } from '@services/members-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-members-list',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './members-list.html',
  styleUrl: './members-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembersList implements OnInit {
  readonly #membersService = inject(MembersService);
  readonly #destroyRef = inject(DestroyRef);

  readonly statuses = MEMBER_STATUSES;

  readonly members = signal<IMember[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly deleting = signal(false);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);

  readonly totalPages = computed(() => {
    const pages = Math.ceil(this.total() / this.limit());
    return pages > 0 ? pages : 1;
  });

  readonly filterForm = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    status: new FormControl<MemberStatus | ''>('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadMembers();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, next) => prev.q === next.q && prev.status === next.status),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.#loadMembers();
      });
  }

  statusLabelKey(status: MemberStatus): string {
    return `MEMBERS.STATUS_${status.toUpperCase()}`;
  }

  previousPage(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.update((value) => value - 1);
    this.#loadMembers();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    this.page.update((value) => value + 1);
    this.#loadMembers();
  }

  askDelete(memberId: string): void {
    this.pendingDeleteId.set(memberId);
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

    this.#membersService
      .remove(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteId.set(null);
          this.feedback.set('MEMBERS.DELETE_SUCCESS');
          this.#loadMembers();
        },
        error: () => {
          this.deleting.set(false);
          this.feedback.set('MEMBERS.DELETE_ERROR');
        },
      });
  }

  #loadMembers(): void {
    this.loading.set(true);
    this.error.set(false);

    const { q, status } = this.filterForm.getRawValue();

    this.#membersService
      .list({
        page: this.page(),
        limit: this.limit(),
        q: q.trim() || undefined,
        status: status || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.members.set(response.data);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
          this.loading.set(false);
        },
        error: () => {
          this.members.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
