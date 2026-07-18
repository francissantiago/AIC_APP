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
import { SMALL_GROUP_STATUSES, SmallGroupStatus } from '@enums/small-group-status';
import { ICreateSmallGroup } from '@interfaces/ICreateSmallGroup';
import { ISmallGroupLeaderOption } from '@interfaces/ISmallGroupLeaderOption';
import { IUpdateSmallGroup } from '@interfaces/IUpdateSmallGroup';
import { ApiErrorService } from '@services/api-error.service';
import { SmallGroupsService } from '@services/small-groups-service';

const DAY_OF_WEEK_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;

const DAY_LABEL_KEYS: Record<(typeof DAY_OF_WEEK_VALUES)[number], string> = {
  0: 'SMALL_GROUPS.DAY_SUNDAY',
  1: 'SMALL_GROUPS.DAY_MONDAY',
  2: 'SMALL_GROUPS.DAY_TUESDAY',
  3: 'SMALL_GROUPS.DAY_WEDNESDAY',
  4: 'SMALL_GROUPS.DAY_THURSDAY',
  5: 'SMALL_GROUPS.DAY_FRIDAY',
  6: 'SMALL_GROUPS.DAY_SATURDAY',
};

@Component({
  selector: 'app-small-group-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './small-group-form.html',
  styleUrl: './small-group-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmallGroupForm implements OnInit {
  readonly #smallGroupsService = inject(SmallGroupsService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly groupId = input<string | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly statuses = SMALL_GROUP_STATUSES;
  readonly daysOfWeek = DAY_OF_WEEK_VALUES;
  readonly leaderOptions = signal<ISmallGroupLeaderOption[]>([]);
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
    leaderMemberId: new FormControl('', { nonNullable: true }),
    address: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
    dayOfWeek: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(6)],
    }),
    startTime: new FormControl('', { nonNullable: true }),
    status: new FormControl<SmallGroupStatus>(SmallGroupStatus.ACTIVE, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    this.#loadLeaderOptions();

    const id = this.groupId();
    if (id) {
      this.isEditMode.set(true);
      this.#loadGroup(id);
    }
  }

  statusLabelKey(status: SmallGroupStatus): string {
    return `SMALL_GROUPS.STATUS_${status.toUpperCase()}`;
  }

  dayLabelKey(dayOfWeek: number): string {
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return 'SMALL_GROUPS.DAY_SUNDAY';
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

  #loadLeaderOptions(): void {
    this.#smallGroupsService
      .leaderOptions({ limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (options) => this.leaderOptions.set(options),
        error: () => this.leaderOptions.set([]),
      });
  }

  #loadGroup(id: string): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.#smallGroupsService
      .getById(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (group) => {
          this.form.patchValue({
            name: group.name,
            description: group.description ?? '',
            leaderMemberId: group.leaderMemberId ?? '',
            address: group.address ?? '',
            dayOfWeek: group.dayOfWeek,
            startTime: this.#normalizeTimeForInput(group.startTime),
            status: group.status,
          });
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadError.set(true);
          this.feedbackKey.set('SMALL_GROUPS.LOAD_ERROR');
        },
      });
  }

  #submitCreate(): void {
    const body = this.#buildPayload();
    this.saving.set(true);

    this.#smallGroupsService
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
    const id = this.groupId();
    if (!id) {
      return;
    }

    const body = this.#buildUpdatePayload();
    this.saving.set(true);

    this.#smallGroupsService
      .update(id, body)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.feedbackKey.set('SMALL_GROUPS.SAVE_SUCCESS');
          this.saved.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.#applySaveError(error);
        },
      });
  }

  #buildPayload(): ICreateSmallGroup {
    const raw = this.form.getRawValue();
    const payload: ICreateSmallGroup = {
      name: raw.name.trim(),
      dayOfWeek: Number(raw.dayOfWeek),
      status: raw.status,
    };

    const description = raw.description.trim();
    if (description) {
      payload.description = description;
    }

    const leaderMemberId = raw.leaderMemberId.trim();
    if (leaderMemberId) {
      payload.leaderMemberId = leaderMemberId;
    }

    const address = raw.address.trim();
    if (address) {
      payload.address = address;
    }

    const startTime = raw.startTime.trim();
    if (startTime) {
      payload.startTime = startTime;
    }

    return payload;
  }

  #buildUpdatePayload(): IUpdateSmallGroup {
    const raw = this.form.getRawValue();
    const description = raw.description.trim();
    const leaderMemberId = raw.leaderMemberId.trim();
    const address = raw.address.trim();
    const startTime = raw.startTime.trim();

    return {
      name: raw.name.trim(),
      dayOfWeek: Number(raw.dayOfWeek),
      status: raw.status,
      description: description || null,
      leaderMemberId: leaderMemberId || null,
      address: address || null,
      startTime: startTime || null,
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
