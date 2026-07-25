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
import { MISSION_FIELD_STATUSES, MissionFieldStatus } from '@enums/mission-field-status';
import { ICreateMissionField } from '@interfaces/IMissionFieldQuery';
import { IUpdateMissionField } from '@interfaces/IMissionFieldQuery';
import { IMember } from '@interfaces/IMember';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { MembersService } from '@services/members-service';
import { MissionFieldsService } from '@services/mission-fields-service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-mission-field-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './mission-field-form.html',
  styleUrl: './mission-field-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionFieldForm implements OnInit {
  readonly #fieldsService = inject(MissionFieldsService);
  readonly #membersService = inject(MembersService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly fieldId = input<string | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly statuses = MISSION_FIELD_STATUSES;
  readonly coordinatorOptions = signal<IMember[]>([]);
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
    country: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    city: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    region: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
    coordinatorMemberId: new FormControl('', { nonNullable: true }),
    status: new FormControl<MissionFieldStatus>(MissionFieldStatus.ACTIVE, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    this.#loadCoordinatorOptions();
    const id = this.fieldId();
    if (id) {
      this.isEditMode.set(true);
      this.#loadField(id);
    }
  }

  statusLabelKey(status: MissionFieldStatus): string {
    return `MISSIONS.FIELD_STATUS_${status.toUpperCase()}`;
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

  #loadCoordinatorOptions(): void {
    if (!this.#auth.hasPermission('members:read')) {
      return;
    }

    this.#membersService
      .list({ page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.coordinatorOptions.set(response.data),
        error: () => this.coordinatorOptions.set([]),
      });
  }

  #loadField(id: string): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.#fieldsService
      .getById(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (field) => {
          this.form.patchValue({
            name: field.name,
            country: field.country,
            city: field.city ?? '',
            region: field.region ?? '',
            description: field.description ?? '',
            coordinatorMemberId: field.coordinatorMemberId ?? '',
            status: field.status,
          });
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
          this.feedbackKey.set('MISSIONS.LOAD_ERROR');
        },
      });
  }

  #submitCreate(): void {
    this.saving.set(true);
    this.#fieldsService
      .create(this.#buildCreatePayload())
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
    const id = this.fieldId();
    if (!id) {
      return;
    }

    this.saving.set(true);
    this.#fieldsService
      .update(id, this.#buildUpdatePayload())
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.feedbackKey.set('MISSIONS.SAVE_SUCCESS');
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.#applySaveError(error);
        },
      });
  }

  #buildCreatePayload(): ICreateMissionField {
    const raw = this.form.getRawValue();
    const payload: ICreateMissionField = {
      name: raw.name.trim(),
      country: raw.country.trim(),
      status: raw.status,
    };
    const city = raw.city.trim();
    const region = raw.region.trim();
    const description = raw.description.trim();
    const coordinatorMemberId = raw.coordinatorMemberId.trim();
    if (city) payload.city = city;
    if (region) payload.region = region;
    if (description) payload.description = description;
    if (coordinatorMemberId) payload.coordinatorMemberId = coordinatorMemberId;
    return payload;
  }

  #buildUpdatePayload(): IUpdateMissionField {
    const raw = this.form.getRawValue();
    return {
      name: raw.name.trim(),
      country: raw.country.trim(),
      status: raw.status,
      city: raw.city.trim() || null,
      region: raw.region.trim() || null,
      description: raw.description.trim() || null,
      coordinatorMemberId: raw.coordinatorMemberId.trim() || null,
    };
  }

  #applySaveError(error: HttpErrorResponse): void {
    const resolved = this.#apiError.resolve(error);
    this.feedbackKey.set(null);
    this.errorMessage.set(resolved.displayMessage);
    this.supportHint.set(resolved.supportHint ?? null);
  }
}
