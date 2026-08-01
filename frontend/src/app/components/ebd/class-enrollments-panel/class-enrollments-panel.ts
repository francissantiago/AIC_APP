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
import { CLASS_ENROLLMENT_STATUSES, ClassEnrollmentStatus } from '@enums/class-enrollment-status';
import { IClassEnrollment } from '@interfaces/IClassEnrollment';
import { IEnrollmentOption } from '@interfaces/IEnrollmentOption';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { ClassesService } from '@services/classes-service';
import { AppDateTimePipe } from '@pipes/app-date-time-pipe';
import {
  applyEntityMembershipMutation,
  EntityMembersListLoader,
  upsertEntityMember,
} from '@utils/entity-members-list.util';

@Component({
  selector: 'app-class-enrollments-panel',
  imports: [AppDateTimePipe, ReactiveFormsModule, TranslatePipe],
  templateUrl: './class-enrollments-panel.html',
  styleUrl: './class-enrollments-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassEnrollmentsPanel implements OnInit {
  readonly #classesService = inject(ClassesService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly classId = input.required<string>();
  readonly changed = output<void>();

  readonly statuses = CLASS_ENROLLMENT_STATUSES;
  readonly enrollments = signal<IClassEnrollment[]>([]);
  readonly memberOptions = signal<IEnrollmentOption[]>([]);
  readonly selectedMemberIds = signal<string[]>([]);
  readonly loading = signal(false);
  readonly enrolling = signal(false);
  readonly error = signal(false);
  readonly feedback = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly pendingRemoveId = signal<string | null>(null);
  readonly removing = signal(false);

  readonly #listLoader = new EntityMembersListLoader<IClassEnrollment>({
    members: this.enrollments,
    loading: this.loading,
    error: this.error,
    fetch: () => {
      const status = this.filterForm.controls.status.value;
      return this.#classesService.listEnrollments(this.classId(), {
        page: 1,
        limit: 100,
        status: status || undefined,
      });
    },
    destroyRef: this.#destroyRef,
  });

  readonly canWrite = computed(() => this.#auth.hasPermission('classes:write'));
  readonly selectedCount = computed(() => this.selectedMemberIds().length);

  readonly filterForm = new FormGroup({
    status: new FormControl<ClassEnrollmentStatus | ''>('', { nonNullable: true }),
  });

  readonly enrollForm = new FormGroup({
    status: new FormControl<ClassEnrollmentStatus>(ClassEnrollmentStatus.ACTIVE, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    this.#listLoader.reload();
    this.#loadEnrollmentOptions();

    this.filterForm.controls.status.valueChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#listLoader.reload());
  }

  statusLabelKey(status: ClassEnrollmentStatus): string {
    return `EBD_ENROLLMENTS.STATUS_${status.toUpperCase()}`;
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

  enrollMembers(): void {
    if (!this.canWrite() || this.enrollForm.invalid) {
      this.enrollForm.markAllAsTouched();
      return;
    }

    const memberIds = this.selectedMemberIds();
    if (memberIds.length === 0) {
      this.feedback.set('EBD_ENROLLMENTS.MEMBERS_REQUIRED');
      return;
    }

    const { status } = this.enrollForm.getRawValue();
    this.enrolling.set(true);
    this.feedback.set(null);
    this.errorMessage.set(null);

    this.#classesService
      .bulkAddEnrollments(this.classId(), { memberIds, status })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (result) => {
          this.enrolling.set(false);
          this.selectedMemberIds.set([]);
          this.enrollForm.reset({ status: ClassEnrollmentStatus.ACTIVE });
          this.feedback.set(
            result.skipped > 0
              ? 'EBD_ENROLLMENTS.BULK_ENROLL_PARTIAL'
              : 'EBD_ENROLLMENTS.BULK_ENROLL_SUCCESS',
          );
          this.#listLoader.reload({ showLoading: false });
          this.#loadEnrollmentOptions();
          this.changed.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.enrolling.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
        },
      });
  }

  changeStatus(memberId: string, status: ClassEnrollmentStatus): void {
    if (!this.canWrite()) {
      return;
    }

    this.feedback.set(null);
    this.errorMessage.set(null);

    this.#classesService
      .updateEnrollmentStatus(this.classId(), memberId, { status })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (updated) => {
          this.enrollments.update((list) => upsertEntityMember(list, updated));
          this.#loadEnrollmentOptions();
        },
        error: (error: HttpErrorResponse) => {
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
          this.#listLoader.reload({ showLoading: false });
        },
      });
  }

  askRemove(memberId: string): void {
    this.pendingRemoveId.set(memberId);
    this.feedback.set(null);
  }

  cancelRemove(): void {
    this.pendingRemoveId.set(null);
  }

  confirmRemove(): void {
    const memberId = this.pendingRemoveId();
    if (!memberId || !this.canWrite()) {
      return;
    }

    this.removing.set(true);
    this.errorMessage.set(null);

    this.#classesService
      .removeEnrollment(this.classId(), memberId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.removing.set(false);
          this.pendingRemoveId.set(null);
          this.feedback.set('EBD_ENROLLMENTS.REMOVE_SUCCESS');
          this.#afterMembershipChange({ removeMemberId: memberId });
        },
        error: (error: HttpErrorResponse) => {
          this.removing.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
        },
      });
  }

  onStatusSelect(memberId: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ClassEnrollmentStatus;
    this.changeStatus(memberId, value);
  }

  #afterMembershipChange(options: { upsert?: IClassEnrollment; removeMemberId?: string }): void {
    this.changed.emit();
    applyEntityMembershipMutation({
      loader: this.#listLoader,
      members: this.enrollments,
      loading: this.loading,
      upsert: options.upsert,
      removeMemberId: options.removeMemberId,
      reloadOptions: () => this.#loadEnrollmentOptions(),
    });
  }

  #loadEnrollmentOptions(): void {
    if (!this.canWrite()) {
      return;
    }

    this.#classesService
      .enrollmentOptions(this.classId(), { limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (options) => this.memberOptions.set(options),
        error: () => this.memberOptions.set([]),
      });
  }
}
