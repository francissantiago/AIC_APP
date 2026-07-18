import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { USER_STATUSES, UserStatus } from '@enums/user-status';
import { ICreateUser } from '@interfaces/ICreateUser';
import { IRole } from '@interfaces/IRole';
import { IUpdateUser } from '@interfaces/IUpdateUser';
import { IUser } from '@interfaces/IUser';
import { ApiErrorService } from '@services/api-error.service';
import { RolesService } from '@services/roles-service';
import { UsersService } from '@services/users-service';
import { switchMap } from 'rxjs';

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (!password && !confirmPassword) {
    return null;
  }
  return password === confirmPassword ? null : { passwordMismatch: true };
}

function minRolesValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as number[] | null;
  return value && value.length >= 1 ? null : { minRoles: true };
}

@Component({
  selector: 'app-user-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserForm implements OnInit {
  readonly #usersService = inject(UsersService);
  readonly #rolesService = inject(RolesService);
  readonly #apiError = inject(ApiErrorService);
  readonly #translate = inject(TranslateService);
  readonly #destroyRef = inject(DestroyRef);

  readonly userId = input<string | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly statuses = USER_STATUSES;
  readonly isEditMode = signal(false);
  readonly roles = signal<IRole[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal(false);
  readonly feedbackKey = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);
  readonly currentUser = signal<IUser | null>(null);
  readonly initialRoleIds = signal<number[]>([]);

  readonly form = new FormGroup(
    {
      username: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
          Validators.pattern(/^[a-zA-Z0-9._-]+$/),
        ],
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email, Validators.maxLength(255)],
      }),
      fullName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(150)],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(8), Validators.maxLength(72)],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      status: new FormControl<UserStatus>(UserStatus.PENDING, {
        nonNullable: true,
        validators: [Validators.required],
      }),
      roleIds: new FormControl<number[]>([], {
        nonNullable: true,
        validators: [minRolesValidator],
      }),
    },
    { validators: [passwordsMatchValidator] },
  );

  ngOnInit(): void {
    this.#loadRoles();

    const id = this.userId();
    if (id) {
      this.isEditMode.set(true);
      this.#configureEditValidators();
      this.#loadUser(id);
    }
  }

  statusLabelKey(status: UserStatus): string {
    return `USERS.STATUS_${status.toUpperCase()}`;
  }

  roleLabel(role: IRole): string {
    const key = `ROLES.CODE_${role.code}`;
    const translated = this.#translate.instant(key);
    return translated !== key ? translated : role.name;
  }

  isRoleSelected(roleId: number): boolean {
    return this.form.controls.roleIds.value.includes(roleId);
  }

  toggleRole(roleId: number): void {
    const current = this.form.controls.roleIds.value;
    const next = current.includes(roleId)
      ? current.filter((id) => id !== roleId)
      : [...current, roleId];
    this.form.controls.roleIds.setValue(next);
    this.form.controls.roleIds.markAsDirty();
    this.form.controls.roleIds.updateValueAndValidity();
  }

  fieldInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  passwordMismatch(): boolean {
    return (
      !!this.form.hasError('passwordMismatch') &&
      (this.form.controls.confirmPassword.dirty || this.form.controls.confirmPassword.touched)
    );
  }

  submit(): void {
    this.feedbackKey.set(null);

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

  #configureEditValidators(): void {
    this.form.controls.username.disable();
    this.form.controls.password.clearValidators();
    this.form.controls.confirmPassword.clearValidators();
    this.form.controls.password.updateValueAndValidity();
    this.form.controls.confirmPassword.updateValueAndValidity();
    this.form.clearValidators();
    this.form.updateValueAndValidity();
  }

  #loadRoles(): void {
    this.#rolesService
      .list()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (roles) => this.roles.set(roles),
        error: () => {
          this.roles.set([]);
          this.feedbackKey.set('ROLES.LOAD_ERROR');
        },
      });
  }

  #loadUser(id: string): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.#usersService
      .getById(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (user) => {
          this.currentUser.set(user);
          const roleIds = user.roles.map((role) => role.id);
          this.initialRoleIds.set(roleIds);
          this.form.patchValue({
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            status: user.status,
            roleIds,
          });
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
          this.feedbackKey.set('USERS.LOAD_ERROR');
        },
      });
  }

  #submitCreate(): void {
    const raw = this.form.getRawValue();
    const body: ICreateUser = {
      username: raw.username.trim(),
      email: raw.email.trim(),
      fullName: raw.fullName.trim(),
      password: raw.password,
      status: raw.status,
      roleIds: raw.roleIds,
    };

    this.saving.set(true);

    this.#usersService
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
    const id = this.userId();
    if (!id) {
      return;
    }

    const raw = this.form.getRawValue();
    const body: IUpdateUser = {
      email: raw.email.trim(),
      fullName: raw.fullName.trim(),
      status: raw.status,
    };

    const nextRoleIds = [...raw.roleIds].sort((a, b) => a - b);
    const previousRoleIds = [...this.initialRoleIds()].sort((a, b) => a - b);
    const rolesChanged =
      nextRoleIds.length !== previousRoleIds.length ||
      nextRoleIds.some((roleId, index) => roleId !== previousRoleIds[index]);

    this.saving.set(true);

    const update$ = this.#usersService.update(id, body);
    const request$ = rolesChanged
      ? update$.pipe(switchMap(() => this.#usersService.setRoles(id, { roleIds: raw.roleIds })))
      : update$;

    request$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.feedbackKey.set('USERS.SAVE_SUCCESS');
        this.saved.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.#applySaveError(error);
      },
    });
  }

  #applySaveError(error: HttpErrorResponse): void {
    const resolved = this.#apiError.resolve(error);
    this.feedbackKey.set(null);
    this.errorMessage.set(resolved.displayMessage);
    this.supportHint.set(resolved.supportHint ?? null);
  }
}
