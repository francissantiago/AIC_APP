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
import { CLASS_AGE_GROUPS, ClassAgeGroup } from '@enums/class-age-group';
import { CLASS_STATUSES, ClassStatus } from '@enums/class-status';
import { IClassTeacherOption } from '@interfaces/IClassTeacherOption';
import { ICreateEbdClass } from '@interfaces/ICreateEbdClass';
import { IUpdateEbdClass } from '@interfaces/IUpdateEbdClass';
import { ApiErrorService } from '@services/api-error.service';
import { ClassesService } from '@services/classes-service';

const DAY_OF_WEEK_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;

const DAY_LABEL_KEYS: Record<(typeof DAY_OF_WEEK_VALUES)[number], string> = {
  0: 'EBD_CLASSES.DAY_SUNDAY',
  1: 'EBD_CLASSES.DAY_MONDAY',
  2: 'EBD_CLASSES.DAY_TUESDAY',
  3: 'EBD_CLASSES.DAY_WEDNESDAY',
  4: 'EBD_CLASSES.DAY_THURSDAY',
  5: 'EBD_CLASSES.DAY_FRIDAY',
  6: 'EBD_CLASSES.DAY_SATURDAY',
};

@Component({
  selector: 'app-class-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './class-form.html',
  styleUrl: './class-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassForm implements OnInit {
  readonly #classesService = inject(ClassesService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly classId = input<string | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly statuses = CLASS_STATUSES;
  readonly ageGroups = CLASS_AGE_GROUPS;
  readonly daysOfWeek = DAY_OF_WEEK_VALUES;
  readonly teacherOptions = signal<IClassTeacherOption[]>([]);
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
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
    ageGroup: new FormControl<ClassAgeGroup>(ClassAgeGroup.MIXED, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    teacherMemberId: new FormControl('', { nonNullable: true }),
    dayOfWeek: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(6)],
    }),
    startTime: new FormControl('', { nonNullable: true }),
    room: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(80)],
    }),
    status: new FormControl<ClassStatus>(ClassStatus.ACTIVE, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    this.#loadTeacherOptions();

    const id = this.classId();
    if (id) {
      this.isEditMode.set(true);
      this.#loadClass(id);
    }
  }

  statusLabelKey(status: ClassStatus): string {
    return status === ClassStatus.ACTIVE ? 'EBD_CLASSES.ACTIVE' : 'EBD_CLASSES.INACTIVE';
  }

  ageGroupLabelKey(ageGroup: ClassAgeGroup): string {
    return `EBD_CLASSES.AGE_GROUP_${ageGroup.toUpperCase()}`;
  }

  dayLabelKey(dayOfWeek: number): string {
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return 'EBD_CLASSES.DAY_SUNDAY';
    }
    return DAY_LABEL_KEYS[dayOfWeek as (typeof DAY_OF_WEEK_VALUES)[number]];
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

  #loadTeacherOptions(): void {
    this.#classesService
      .teacherOptions({ limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (options) => this.teacherOptions.set(options),
        error: () => this.teacherOptions.set([]),
      });
  }

  #loadClass(id: string): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.#classesService
      .getById(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (ebdClass) => {
          this.form.patchValue({
            name: ebdClass.name,
            description: ebdClass.description ?? '',
            ageGroup: ebdClass.ageGroup,
            teacherMemberId: ebdClass.teacherMemberId ?? '',
            dayOfWeek: ebdClass.dayOfWeek,
            startTime: this.#normalizeTimeForInput(ebdClass.startTime),
            room: ebdClass.room ?? '',
            status: ebdClass.status,
          });
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
          this.feedbackKey.set('EBD_CLASSES.LOAD_ERROR');
        },
      });
  }

  #submitCreate(): void {
    const body = this.#buildPayload();
    this.saving.set(true);

    this.#classesService
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
    const id = this.classId();
    if (!id) {
      return;
    }

    const body = this.#buildUpdatePayload();
    this.saving.set(true);

    this.#classesService
      .update(id, body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.feedbackKey.set('EBD_CLASSES.SAVE_SUCCESS');
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.#applySaveError(error);
        },
      });
  }

  #buildPayload(): ICreateEbdClass {
    const raw = this.form.getRawValue();
    const payload: ICreateEbdClass = {
      name: raw.name.trim(),
      ageGroup: raw.ageGroup,
      dayOfWeek: Number(raw.dayOfWeek),
      status: raw.status,
    };

    const description = raw.description.trim();
    if (description) {
      payload.description = description;
    }

    const teacherMemberId = raw.teacherMemberId.trim();
    if (teacherMemberId) {
      payload.teacherMemberId = teacherMemberId;
    }

    const startTime = raw.startTime.trim();
    if (startTime) {
      payload.startTime = startTime;
    }

    const room = raw.room.trim();
    if (room) {
      payload.room = room;
    }

    return payload;
  }

  #buildUpdatePayload(): IUpdateEbdClass {
    const raw = this.form.getRawValue();
    const description = raw.description.trim();
    const teacherMemberId = raw.teacherMemberId.trim();
    const startTime = raw.startTime.trim();
    const room = raw.room.trim();

    return {
      name: raw.name.trim(),
      ageGroup: raw.ageGroup,
      dayOfWeek: Number(raw.dayOfWeek),
      status: raw.status,
      description: description || null,
      teacherMemberId: teacherMemberId || null,
      startTime: startTime || null,
      room: room || null,
    };
  }

  #normalizeTimeForInput(value: string | null): string {
    if (!value) {
      return '';
    }
    return value.length >= 5 ? value.slice(0, 5) : value;
  }

  #applySaveError(error: HttpErrorResponse): void {
    const resolved = this.#apiError.resolve(error);
    this.feedbackKey.set(null);
    this.errorMessage.set(resolved.displayMessage);
    this.supportHint.set(resolved.supportHint ?? null);
  }
}
