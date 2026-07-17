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
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { USER_STATUSES, UserStatus } from '@enums/user-status';
import { IRole } from '@interfaces/IRole';
import { IUser } from '@interfaces/IUser';
import { RolesService } from '@services/roles-service';
import { UsersService } from '@services/users-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-users-list',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './users-list.html',
  styleUrl: './users-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersList implements OnInit {
  readonly #usersService = inject(UsersService);
  readonly #rolesService = inject(RolesService);
  readonly #translate = inject(TranslateService);
  readonly #destroyRef = inject(DestroyRef);

  readonly statuses = USER_STATUSES;

  readonly users = signal<IUser[]>([]);
  readonly roles = signal<IRole[]>([]);
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
    status: new FormControl<UserStatus | ''>('', { nonNullable: true }),
    roleCode: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadRoles();
    this.#loadUsers();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (prev, next) =>
            prev.q === next.q && prev.status === next.status && prev.roleCode === next.roleCode,
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.#loadUsers();
      });
  }

  statusLabelKey(status: UserStatus): string {
    return `USERS.STATUS_${status.toUpperCase()}`;
  }

  roleLabel(role: IRole): string {
    const key = `ROLES.CODE_${role.code}`;
    const translated = this.#translate.instant(key);
    return translated !== key ? translated : role.name;
  }

  rolesSummary(user: IUser): string {
    return user.roles.map((role) => this.roleLabel(role)).join(', ');
  }

  previousPage(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.update((value) => value - 1);
    this.#loadUsers();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    this.page.update((value) => value + 1);
    this.#loadUsers();
  }

  askDelete(userId: string): void {
    this.pendingDeleteId.set(userId);
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

    this.#usersService
      .remove(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteId.set(null);
          this.feedback.set('USERS.DELETE_SUCCESS');
          this.#loadUsers();
        },
        error: () => {
          this.deleting.set(false);
          this.feedback.set('USERS.DELETE_ERROR');
        },
      });
  }

  #loadRoles(): void {
    this.#rolesService
      .list()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (roles) => this.roles.set(roles),
        error: () => this.roles.set([]),
      });
  }

  #loadUsers(): void {
    this.loading.set(true);
    this.error.set(false);

    const { q, status, roleCode } = this.filterForm.getRawValue();

    this.#usersService
      .list({
        page: this.page(),
        limit: this.limit(),
        q: q.trim() || undefined,
        status: status || undefined,
        roleCode: roleCode || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.users.set(response.data);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
          this.loading.set(false);
        },
        error: () => {
          this.users.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
