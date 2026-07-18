import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ICreateRole } from '@interfaces/ICreateRole';
import { IPermission } from '@interfaces/IPermission';
import { IUpdateRole } from '@interfaces/IUpdateRole';
import { ApiErrorService } from '@services/api-error.service';
import { PermissionsService } from '@services/permissions-service';
import { RolesService } from '@services/roles-service';

const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_]{1,29}$/;
const ADMIN_ROLE_CODE = 'ADMIN';
const ROLES_WRITE_PERMISSION_CODE = 'roles:write';

/** Ordem fixa de exibição dos grupos de permissão (recursos do sistema). */
const RESOURCE_ORDER = [
  'users',
  'roles',
  'members',
  'congregations',
  'finance',
  'assets',
  'secretariat',
] as const;

export type PermissionResourceGroup = {
  resource: string;
  read: IPermission | null;
  write: IPermission | null;
};

@Component({
  selector: 'app-role-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './role-form.html',
  styleUrl: './role-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleForm implements OnInit {
  readonly #rolesService = inject(RolesService);
  readonly #permissionsService = inject(PermissionsService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly roleId = input<number | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly isEditMode = signal(false);
  readonly roleLoading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal(false);
  readonly feedbackKey = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);

  readonly roleCode = signal<string | null>(null);
  readonly permissionsCatalog = signal<IPermission[]>([]);
  readonly permissionsLoading = signal(false);
  readonly permissionsLoadError = signal(false);
  readonly selectedPermissionIds = signal<ReadonlySet<number>>(new Set());

  readonly loading = computed(() => this.roleLoading() || this.permissionsLoading());

  readonly rolesWritePermissionId = computed(
    () => this.permissionsCatalog().find((p) => p.code === ROLES_WRITE_PERMISSION_CODE)?.id ?? null,
  );

  readonly isAdminRolesWriteLocked = computed(() => this.roleCode() === ADMIN_ROLE_CODE);

  readonly resourceGroups = computed<PermissionResourceGroup[]>(() => {
    const catalog = this.permissionsCatalog();
    return RESOURCE_ORDER.map((resource) => ({
      resource,
      read: catalog.find((p) => p.resource === resource && p.action === 'read') ?? null,
      write: catalog.find((p) => p.resource === resource && p.action === 'write') ?? null,
    })).filter((group) => group.read || group.write);
  });

  readonly form = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(CODE_PATTERN)],
    }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
  });

  ngOnInit(): void {
    this.#loadPermissionsCatalog();

    const id = this.roleId();
    if (id) {
      this.isEditMode.set(true);
      this.form.controls.code.disable();
      this.#loadRole(id);
    }
  }

  fieldInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  resourceLabelKey(resource: string): string {
    return `PERMISSIONS.RESOURCE_${resource.toUpperCase()}`;
  }

  actionLabelKey(action: 'read' | 'write'): string {
    return action === 'read' ? 'PERMISSIONS.ACTION_READ' : 'PERMISSIONS.ACTION_WRITE';
  }

  isPermissionChecked(permission: IPermission): boolean {
    if (this.isAdminRolesWriteLocked() && permission.code === ROLES_WRITE_PERMISSION_CODE) {
      return true;
    }
    return this.selectedPermissionIds().has(permission.id);
  }

  isPermissionDisabled(permission: IPermission): boolean {
    return this.isAdminRolesWriteLocked() && permission.code === ROLES_WRITE_PERMISSION_CODE;
  }

  togglePermission(permission: IPermission): void {
    if (this.isPermissionDisabled(permission)) {
      return;
    }

    const next = new Set(this.selectedPermissionIds());
    if (next.has(permission.id)) {
      next.delete(permission.id);
    } else {
      next.add(permission.id);
    }
    this.selectedPermissionIds.set(next);
  }

  submit(): void {
    this.feedbackKey.set(null);
    this.errorMessage.set(null);
    this.supportHint.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.isEditMode()) {
      this.#submitEdit();
      return;
    }

    this.#submitCreate();
  }

  #loadPermissionsCatalog(): void {
    this.permissionsLoading.set(true);
    this.permissionsLoadError.set(false);

    this.#permissionsService
      .list()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (permissions) => {
          this.permissionsCatalog.set(permissions);
          this.permissionsLoading.set(false);
        },
        error: () => {
          this.permissionsLoading.set(false);
          this.permissionsLoadError.set(true);
        },
      });
  }

  #loadRole(id: number): void {
    this.roleLoading.set(true);
    this.loadError.set(false);

    this.#rolesService
      .getById(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (role) => {
          this.form.patchValue({
            code: role.code,
            name: role.name,
            description: role.description ?? '',
          });
          this.roleCode.set(role.code);
          this.selectedPermissionIds.set(new Set(role.permissions.map((p) => p.id)));
          this.roleLoading.set(false);
        },
        error: () => {
          this.roleLoading.set(false);
          this.loadError.set(true);
          this.feedbackKey.set('ROLES.LOAD_ERROR');
        },
      });
  }

  #submitCreate(): void {
    const raw = this.form.getRawValue();
    const body: ICreateRole = {
      code: raw.code.trim().toUpperCase(),
      name: raw.name.trim(),
      description: this.#normalizeDescription(raw.description),
      ...this.#buildPermissionIdsPayload(),
    };

    this.saving.set(true);

    this.#rolesService
      .create(body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.#applySaveError(error);
        },
      });
  }

  #submitEdit(): void {
    const id = this.roleId();
    if (!id) {
      return;
    }

    const raw = this.form.getRawValue();
    const body: IUpdateRole = {
      name: raw.name.trim(),
      description: this.#normalizeDescription(raw.description),
      ...this.#buildPermissionIdsPayload(),
    };

    this.saving.set(true);

    this.#rolesService
      .update(id, body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.#applySaveError(error);
        },
      });
  }

  /**
   * Se o catálogo de permissões falhou ao carregar, omite `permissionIds` do payload
   * para não sobrescrever silenciosamente as permissões atuais do papel com uma seleção vazia.
   */
  #buildPermissionIdsPayload(): { permissionIds?: number[] } {
    if (this.permissionsLoadError()) {
      return {};
    }

    const selected = new Set(this.selectedPermissionIds());
    const rolesWriteId = this.rolesWritePermissionId();
    if (this.isAdminRolesWriteLocked() && rolesWriteId !== null) {
      selected.add(rolesWriteId);
    }

    return { permissionIds: Array.from(selected) };
  }

  #normalizeDescription(value: string): string | null {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  #applySaveError(error: HttpErrorResponse): void {
    const resolved = this.#apiError.resolve(error);
    this.feedbackKey.set(null);
    this.errorMessage.set(resolved.displayMessage);
    this.supportHint.set(resolved.supportHint ?? null);

    if (resolved.code === 'ROLES.CODE_IN_USE') {
      this.feedbackKey.set('ROLES.CONFLICT_ERROR');
      this.errorMessage.set(null);
    }
  }
}
