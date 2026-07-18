import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
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

@Component({
  selector: 'app-class-enrollments-panel',
  imports: [ReactiveFormsModule, TranslatePipe],
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

  readonly statuses = CLASS_ENROLLMENT_STATUSES;
  readonly enrollments = signal<IClassEnrollment[]>([]);
  readonly memberOptions = signal<IEnrollmentOption[]>([]);
  readonly loading = signal(false);
  readonly enrolling = signal(false);
  readonly error = signal(false);
  readonly feedback = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly pendingRemoveId = signal<string | null>(null);
  readonly removing = signal(false);

  readonly canWrite = computed(() => this.#auth.hasPermission('classes:write'));

  readonly filterForm = new FormGroup({
    status: new FormControl<ClassEnrollmentStatus | ''>('', { nonNullable: true }),
  });

  readonly enrollForm = new FormGroup({
    memberId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    status: new FormControl<ClassEnrollmentStatus>(ClassEnrollmentStatus.ACTIVE, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    this.#loadEnrollments();
    this.#loadEnrollmentOptions();

    this.filterForm.controls.status.valueChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#loadEnrollments());
  }

  statusLabelKey(status: ClassEnrollmentStatus): string {
    return `EBD_ENROLLMENTS.STATUS_${status.toUpperCase()}`;
  }

  enrollMember(): void {
    if (!this.canWrite() || this.enrollForm.invalid) {
      this.enrollForm.markAllAsTouched();
      return;
    }

    const { memberId, status } = this.enrollForm.getRawValue();
    this.enrolling.set(true);
    this.feedback.set(null);
    this.errorMessage.set(null);

    this.#classesService
      .addEnrollment(this.classId(), { memberId, status })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.enrolling.set(false);
          this.enrollForm.reset({ memberId: '', status: ClassEnrollmentStatus.ACTIVE });
          this.feedback.set('EBD_ENROLLMENTS.ENROLL_SUCCESS');
          this.#loadEnrollments();
          this.#loadEnrollmentOptions();
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
          this.enrollments.update((list) =>
            list.map((item) => (item.memberId === memberId ? updated : item)),
          );
          this.#loadEnrollmentOptions();
        },
        error: (error: HttpErrorResponse) => {
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
          this.#loadEnrollments();
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
          this.#loadEnrollments();
          this.#loadEnrollmentOptions();
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

  #loadEnrollments(): void {
    this.loading.set(true);
    this.error.set(false);

    const status = this.filterForm.controls.status.value;

    this.#classesService
      .listEnrollments(this.classId(), {
        page: 1,
        limit: 100,
        status: status || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.enrollments.set(response.data);
          this.loading.set(false);
        },
        error: () => {
          this.enrollments.set([]);
          this.loading.set(false);
          this.error.set(true);
        },
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
