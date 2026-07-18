import { HttpErrorResponse } from '@angular/common/http';
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
import { AppDialog } from '@components/app-dialog/app-dialog';
import { RoleForm } from '@components/roles/role-form/role-form';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { IRole, isSystemRole } from '@interfaces/IRole';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { RolesService } from '@services/roles-service';

@Component({
  selector: 'app-roles-catalog',
  imports: [AppDialog, RoleForm, TranslatePipe],
  templateUrl: './roles-catalog.html',
  styleUrl: './roles-catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesCatalog implements OnInit {
  readonly #rolesService = inject(RolesService);
  readonly #authService = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #translate = inject(TranslateService);
  readonly #destroyRef = inject(DestroyRef);

  readonly roles = signal<IRole[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly deleting = signal(false);
  readonly pendingDeleteId = signal<number | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly editingId = signal<number | null>(null);

  readonly canWrite = computed(() => this.#authService.hasPermission('roles:write'));

  ngOnInit(): void {
    this.#loadRoles();
  }

  roleLabel(role: IRole): string {
    const key = `ROLES.CODE_${role.code}`;
    const translated = this.#translate.instant(key);
    return translated !== key ? translated : role.name;
  }

  isSystem(role: IRole): boolean {
    return isSystemRole(role);
  }

  openCreate(): void {
    this.editingId.set(null);
    this.pendingDeleteId.set(null);
    this.showForm.set(true);
  }

  openEdit(id: number): void {
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
    this.feedback.set('ROLES.SAVE_SUCCESS');
    this.errorMessage.set(null);
    this.#loadRoles();
  }

  askDelete(roleId: number): void {
    this.closeForm();
    this.pendingDeleteId.set(roleId);
    this.feedback.set(null);
    this.errorMessage.set(null);
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
    this.errorMessage.set(null);

    this.#rolesService
      .delete(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteId.set(null);
          this.feedback.set('ROLES.DELETE_SUCCESS');
          this.#loadRoles();
        },
        error: (error: HttpErrorResponse) => {
          this.deleting.set(false);
          this.#applyDeleteError(error);
        },
      });
  }

  #applyDeleteError(error: HttpErrorResponse): void {
    const resolved = this.#apiError.resolve(error);
    if (resolved.code === 'ROLES.SYSTEM_PROTECTED') {
      this.feedback.set('ROLES.DELETE_BLOCKED_SYSTEM');
      this.errorMessage.set(null);
      return;
    }
    if (resolved.code === 'ROLES.IN_USE') {
      this.feedback.set('ROLES.DELETE_BLOCKED_ASSIGNED');
      this.errorMessage.set(null);
      return;
    }
    this.feedback.set('ROLES.DELETE_ERROR');
    this.errorMessage.set(resolved.displayMessage);
  }

  #loadRoles(): void {
    this.loading.set(true);
    this.error.set(false);

    this.#rolesService
      .list()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (roles) => {
          this.roles.set(roles);
          this.loading.set(false);
        },
        error: () => {
          this.roles.set([]);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
