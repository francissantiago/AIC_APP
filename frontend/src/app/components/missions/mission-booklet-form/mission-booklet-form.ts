import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CurrencyInput } from '@components/currency-input/currency-input';
import { DateInput } from '@components/date-input/date-input';
import { TranslatePipe } from '@ngx-translate/core';
import {
  MISSION_BOOKLET_DESTINATION_TYPES,
  MissionBookletDestinationType,
} from '@enums/mission-booklet-destination-type';
import { MissionAssignmentStatus } from '@enums/mission-assignment-status';
import { MissionFieldStatus } from '@enums/mission-field-status';
import { ICreateMissionBookletsBulk, IUpdateMissionBooklet } from '@interfaces/IMissionBookletQuery';
import { IMember } from '@interfaces/IMember';
import { IMissionAssignment } from '@interfaces/IMissionAssignment';
import { IMissionField } from '@interfaces/IMissionField';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { MembersService } from '@services/members-service';
import { MissionAssignmentsService } from '@services/mission-assignments-service';
import { MissionBookletsService } from '@services/mission-booklets-service';
import { MissionFieldsService } from '@services/mission-fields-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-mission-booklet-form',
  imports: [CurrencyInput, DateInput, ReactiveFormsModule, TranslatePipe],
  templateUrl: './mission-booklet-form.html',
  styleUrl: './mission-booklet-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionBookletForm implements OnInit {
  readonly #bookletsService = inject(MissionBookletsService);
  readonly #membersService = inject(MembersService);
  readonly #fieldsService = inject(MissionFieldsService);
  readonly #assignmentsService = inject(MissionAssignmentsService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly bookletId = input<string | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly destinationTypes = MISSION_BOOKLET_DESTINATION_TYPES;
  readonly DestinationType = MissionBookletDestinationType;
  readonly memberOptions = signal<IMember[]>([]);
  readonly selectedMemberIds = signal<string[]>([]);
  readonly memberQuery = signal('');
  readonly fieldOptions = signal<IMissionField[]>([]);
  readonly assignmentOptions = signal<IMissionAssignment[]>([]);
  readonly isEditMode = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal(false);
  readonly feedbackKey = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);

  readonly memberQueryControl = new FormControl('', { nonNullable: true });

  readonly selectedCount = computed(() => this.selectedMemberIds().length);

  readonly form = new FormGroup({
    destinationType: new FormControl(MissionBookletDestinationType.GENERAL, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    missionFieldId: new FormControl('', { nonNullable: true }),
    missionAssignmentId: new FormControl('', { nonNullable: true }),
    title: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(120)] }),
    installmentCount: new FormControl<number | null>(12, {
      validators: [Validators.required, Validators.min(1), Validators.max(120)],
    }),
    installmentAmount: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
    firstDueDate: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(65535)] }),
  });

  constructor() {
    effect(() => {
      const destinationType = this.form.controls.destinationType.value;
      const fieldControl = this.form.controls.missionFieldId;
      const assignmentControl = this.form.controls.missionAssignmentId;

      if (destinationType === MissionBookletDestinationType.FIELD) {
        fieldControl.setValidators([Validators.required]);
        assignmentControl.clearValidators();
      } else if (destinationType === MissionBookletDestinationType.ASSIGNMENT) {
        assignmentControl.setValidators([Validators.required]);
        fieldControl.clearValidators();
      } else {
        fieldControl.clearValidators();
        assignmentControl.clearValidators();
      }

      fieldControl.updateValueAndValidity({ emitEvent: false });
      assignmentControl.updateValueAndValidity({ emitEvent: false });
    });

    this.memberQueryControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.#destroyRef))
      .subscribe((query) => {
        this.memberQuery.set(query.trim());
        this.#loadMemberOptions(query.trim());
      });
  }

  ngOnInit(): void {
    const id = this.bookletId();
    if (id) {
      this.isEditMode.set(true);
      this.form.controls.destinationType.disable();
      this.form.controls.missionFieldId.disable();
      this.form.controls.missionAssignmentId.disable();
      this.form.controls.installmentCount.disable();
      this.form.controls.installmentAmount.disable();
      this.form.controls.firstDueDate.disable();
      this.#loadBooklet(id);
      return;
    }

    this.#loadCreateOptions();
  }

  destinationLabelKey(type: MissionBookletDestinationType): string {
    return `MISSIONS.BOOKLETS.DESTINATION_${type.toUpperCase()}`;
  }

  fieldInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  isMemberSelected(memberId: string): boolean {
    return this.selectedMemberIds().includes(memberId);
  }

  toggleMember(memberId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedMemberIds.update((ids) => {
      if (checked) {
        return ids.includes(memberId) ? ids : [...ids, memberId];
      }
      return ids.filter((id) => id !== memberId);
    });
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

    if (this.selectedMemberIds().length === 0) {
      this.feedbackKey.set('MISSIONS.BOOKLETS.MEMBERS_REQUIRED');
      return;
    }

    this.#submitCreateBulk();
  }

  #loadCreateOptions(): void {
    this.#loadMemberOptions('');

    this.#fieldsService
      .list({ page: 1, limit: 100, status: MissionFieldStatus.ACTIVE })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.fieldOptions.set(response.data),
        error: () => this.fieldOptions.set([]),
      });

    this.#assignmentsService
      .list({ page: 1, limit: 100, status: MissionAssignmentStatus.ACTIVE })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.assignmentOptions.set(response.data),
        error: () => this.assignmentOptions.set([]),
      });
  }

  #loadMemberOptions(query: string): void {
    if (!this.#auth.hasPermission('members:read')) {
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length > 0 && trimmed.length < 3) {
      this.memberOptions.set([]);
      return;
    }

    this.#membersService
      .list({ page: 1, limit: 50, q: trimmed || undefined })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.memberOptions.set(response.data),
        error: () => this.memberOptions.set([]),
      });
  }

  #loadBooklet(id: string): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.#bookletsService
      .getById(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (booklet) => {
          this.form.patchValue({
            destinationType: booklet.destinationType,
            missionFieldId: booklet.missionFieldId ?? '',
            missionAssignmentId: booklet.missionAssignmentId ?? '',
            title: booklet.title ?? '',
            installmentCount: booklet.installmentCount,
            installmentAmount: Number(booklet.installmentAmount),
            firstDueDate: booklet.firstDueDate,
            notes: booklet.notes ?? '',
          });
          this.selectedMemberIds.set([booklet.memberId]);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
          this.feedbackKey.set('MISSIONS.LOAD_ERROR');
        },
      });
  }

  #submitCreateBulk(): void {
    this.saving.set(true);
    this.#bookletsService
      .createBulk(this.#buildBulkPayload())
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
    const id = this.bookletId();
    if (!id) {
      return;
    }

    this.saving.set(true);
    this.#bookletsService
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

  #buildBulkPayload(): ICreateMissionBookletsBulk {
    const raw = this.form.getRawValue();
    const payload: ICreateMissionBookletsBulk = {
      memberIds: this.selectedMemberIds(),
      destinationType: raw.destinationType,
      installmentCount: raw.installmentCount ?? 1,
      installmentAmount: raw.installmentAmount ?? 0,
      firstDueDate: raw.firstDueDate,
    };

    const title = raw.title.trim();
    const notes = raw.notes.trim();
    if (title) payload.title = title;
    if (notes) payload.notes = notes;

    if (raw.destinationType === MissionBookletDestinationType.FIELD) {
      payload.missionFieldId = raw.missionFieldId;
    }
    if (raw.destinationType === MissionBookletDestinationType.ASSIGNMENT) {
      payload.missionAssignmentId = raw.missionAssignmentId;
    }

    return payload;
  }

  #buildUpdatePayload(): IUpdateMissionBooklet {
    const raw = this.form.getRawValue();
    return {
      title: raw.title.trim() || null,
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
