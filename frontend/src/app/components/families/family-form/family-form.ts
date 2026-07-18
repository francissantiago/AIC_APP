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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MemberStatus } from '@enums/member-status';
import { ICreateFamily } from '@interfaces/ICreateFamily';
import { IMember } from '@interfaces/IMember';
import { IUpdateFamily } from '@interfaces/IUpdateFamily';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { FamiliesService } from '@services/families-service';
import { MembersService } from '@services/members-service';

@Component({
  selector: 'app-family-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './family-form.html',
  styleUrl: './family-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyForm implements OnInit {
  readonly #familiesService = inject(FamiliesService);
  readonly #membersService = inject(MembersService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly familyId = input<string | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly headOptions = signal<IMember[]>([]);
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal(false);
  readonly feedbackKey = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(1), Validators.maxLength(120)],
    }),
    notes: new FormControl('', { nonNullable: true }),
    headMemberId: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadHeadOptions();

    const id = this.familyId();
    if (id) {
      this.isEditMode.set(true);
      this.#loadFamily(id);
    }
  }

  fieldInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
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

  #loadHeadOptions(): void {
    if (!this.#auth.hasPermission('members:read')) {
      return;
    }

    this.#membersService
      .list({ page: 1, limit: 100, status: MemberStatus.ACTIVE })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.headOptions.set(response.data),
        error: () => this.headOptions.set([]),
      });
  }

  #loadFamily(id: string): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.#familiesService
      .getById(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (family) => {
          this.form.patchValue({
            name: family.name,
            notes: family.notes ?? '',
            headMemberId: family.headMemberId ?? '',
          });
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
          this.feedbackKey.set('ERRORS.LOAD_FAILED');
        },
      });
  }

  #submitCreate(): void {
    const body = this.#buildCreatePayload();
    this.saving.set(true);

    this.#familiesService
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
    const id = this.familyId();
    if (!id) {
      return;
    }

    const body = this.#buildUpdatePayload();
    this.saving.set(true);

    this.#familiesService
      .update(id, body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.feedbackKey.set('FAMILIES.SAVE_SUCCESS');
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.#applySaveError(error);
        },
      });
  }

  #buildCreatePayload(): ICreateFamily {
    const raw = this.form.getRawValue();
    const payload: ICreateFamily = {
      name: raw.name.trim(),
    };

    const notes = raw.notes.trim();
    if (notes) {
      payload.notes = notes;
    }

    const headMemberId = raw.headMemberId.trim();
    if (headMemberId) {
      payload.headMemberId = headMemberId;
    }

    return payload;
  }

  #buildUpdatePayload(): IUpdateFamily {
    const raw = this.form.getRawValue();
    const notes = raw.notes.trim();
    const headMemberId = raw.headMemberId.trim();

    return {
      name: raw.name.trim(),
      notes: notes || null,
      headMemberId: headMemberId || null,
    };
  }

  #applySaveError(error: HttpErrorResponse): void {
    const resolved = this.#apiError.resolve(error);
    this.feedbackKey.set(null);
    this.errorMessage.set(resolved.displayMessage);
    this.supportHint.set(resolved.supportHint ?? null);
  }
}
