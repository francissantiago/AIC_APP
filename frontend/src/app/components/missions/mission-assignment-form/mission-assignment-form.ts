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
import {
  MISSION_ASSIGNMENT_ROLES,
  MissionAssignmentRole,
} from '@enums/mission-assignment-role';
import {
  MISSION_ASSIGNMENT_STATUSES,
  MissionAssignmentStatus,
} from '@enums/mission-assignment-status';
import { MissionFieldStatus } from '@enums/mission-field-status';
import { ICreateMissionAssignment } from '@interfaces/IMissionAssignmentQuery';
import { IUpdateMissionAssignment } from '@interfaces/IMissionAssignmentQuery';
import { IMember } from '@interfaces/IMember';
import { IMissionField } from '@interfaces/IMissionField';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { MembersService } from '@services/members-service';
import { MissionAssignmentsService } from '@services/mission-assignments-service';
import { MissionFieldsService } from '@services/mission-fields-service';

@Component({
  selector: 'app-mission-assignment-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './mission-assignment-form.html',
  styleUrl: './mission-assignment-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionAssignmentForm implements OnInit {
  readonly #assignmentsService = inject(MissionAssignmentsService);
  readonly #fieldsService = inject(MissionFieldsService);
  readonly #membersService = inject(MembersService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly assignmentId = input<string | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly roles = MISSION_ASSIGNMENT_ROLES;
  readonly statuses = MISSION_ASSIGNMENT_STATUSES;
  readonly memberOptions = signal<IMember[]>([]);
  readonly fieldOptions = signal<IMissionField[]>([]);
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal(false);
  readonly feedbackKey = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);

  readonly form = new FormGroup({
    memberId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    missionFieldId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    role: new FormControl<MissionAssignmentRole>(MissionAssignmentRole.MISSIONARY, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    status: new FormControl<MissionAssignmentStatus>(MissionAssignmentStatus.ACTIVE, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    startDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    expectedEndDate: new FormControl('', { nonNullable: true }),
    actualEndDate: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadOptions();
    const id = this.assignmentId();
    if (id) {
      this.isEditMode.set(true);
      this.#loadAssignment(id);
    }
  }

  roleLabelKey(role: MissionAssignmentRole): string {
    return `MISSIONS.ROLE_${role.toUpperCase()}`;
  }

  statusLabelKey(status: MissionAssignmentStatus): string {
    return `MISSIONS.STATUS_${status.toUpperCase()}`;
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

  #loadOptions(): void {
    if (this.#auth.hasPermission('members:read')) {
      this.#membersService
        .list({ page: 1, limit: 100 })
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: (response) => this.memberOptions.set(response.data),
          error: () => this.memberOptions.set([]),
        });
    }

    this.#fieldsService
      .list({ page: 1, limit: 100, status: MissionFieldStatus.ACTIVE })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.fieldOptions.set(response.data),
        error: () => this.fieldOptions.set([]),
      });
  }

  #loadAssignment(id: string): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.#assignmentsService
      .getById(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (assignment) => {
          this.form.patchValue({
            memberId: assignment.memberId,
            missionFieldId: assignment.missionFieldId,
            role: assignment.role,
            status: assignment.status,
            startDate: assignment.startDate,
            expectedEndDate: assignment.expectedEndDate ?? '',
            actualEndDate: assignment.actualEndDate ?? '',
            notes: assignment.notes ?? '',
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
    this.#assignmentsService
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
    const id = this.assignmentId();
    if (!id) return;

    this.saving.set(true);
    this.#assignmentsService
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

  #buildCreatePayload(): ICreateMissionAssignment {
    const raw = this.form.getRawValue();
    const payload: ICreateMissionAssignment = {
      memberId: raw.memberId,
      missionFieldId: raw.missionFieldId,
      role: raw.role,
      status: raw.status,
      startDate: raw.startDate,
    };
    const expectedEndDate = raw.expectedEndDate.trim();
    const notes = raw.notes.trim();
    if (expectedEndDate) payload.expectedEndDate = expectedEndDate;
    if (notes) payload.notes = notes;
    return payload;
  }

  #buildUpdatePayload(): IUpdateMissionAssignment {
    const raw = this.form.getRawValue();
    return {
      memberId: raw.memberId,
      missionFieldId: raw.missionFieldId,
      role: raw.role,
      status: raw.status,
      startDate: raw.startDate,
      expectedEndDate: raw.expectedEndDate.trim() || null,
      actualEndDate: raw.actualEndDate.trim() || null,
      notes: raw.notes.trim() || null,
    };
  }

  #applySaveError(error: HttpErrorResponse): void {
    const resolved = this.#apiError.resolve(error);
    this.feedbackKey.set(null);
    this.errorMessage.set(resolved.displayMessage);
    this.supportHint.set(resolved.supportHint ?? null);
  }
}
