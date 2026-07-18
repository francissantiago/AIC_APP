import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppDialog } from '@components/app-dialog/app-dialog';
import { MinistryStatus } from '@enums/ministry-status';
import { IMinistry } from '@interfaces/IMinistry';
import { ICalendarEvent } from '@interfaces/ISecretariat';
import { IScheduleAssignment } from '@interfaces/IScheduleAssignment';
import { IScheduleMemberOption } from '@interfaces/IScheduleMemberOption';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ApiErrorService } from '@services/api-error.service';
import { MinistriesService } from '@services/ministries-service';
import { SchedulesService } from '@services/schedules-service';
import { SecretariatService } from '@services/secretariat-service';
import { forkJoin } from 'rxjs';

type AssignmentRowForm = FormGroup<{
  memberId: FormControl<string>;
  roleLabel: FormControl<string>;
  confirmed: FormControl<boolean>;
  notes: FormControl<string>;
}>;

@Component({
  selector: 'app-schedule-event-editor',
  imports: [AppDialog, DatePipe, ReactiveFormsModule, TranslatePipe],
  templateUrl: './schedule-event-editor.html',
  styleUrl: './schedule-event-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleEventEditor {
  readonly #schedules = inject(SchedulesService);
  readonly #ministries = inject(MinistriesService);
  readonly #secretariat = inject(SecretariatService);
  readonly #apiError = inject(ApiErrorService);
  readonly #translate = inject(TranslateService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly open = input(false);
  readonly eventId = input<string | null>(null);
  readonly ministryId = input<string | null>(null);
  readonly canWrite = input(false);

  readonly closed = output<void>();
  readonly saved = output<void>();

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly supportHint = signal<string | null>(null);
  readonly ministries = signal<IMinistry[]>([]);
  readonly events = signal<ICalendarEvent[]>([]);
  readonly memberOptions = signal<IScheduleMemberOption[]>([]);
  readonly eventAssignments = signal<IScheduleAssignment[]>([]);

  readonly dialogOpen = computed(() => this.open());

  readonly form = new FormGroup({
    calendarEventId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    ministryId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    rows: new FormArray<AssignmentRowForm>([]),
  });

  readonly rows = this.form.controls.rows;

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.#bootstrap();
    });

    effect(() => {
      if (this.canWrite()) {
        this.form.enable({ emitEvent: false });
      } else {
        this.form.disable({ emitEvent: false });
      }
    });
  }

  onDialogClosed(): void {
    this.#resetState();
    this.closed.emit();
  }

  onEventChange(): void {
    const eventId = this.form.controls.calendarEventId.value;
    if (!eventId) {
      this.eventAssignments.set([]);
      this.#rebuildRows([]);
      return;
    }
    this.#loadEventAssignments(eventId);
  }

  onMinistryChange(): void {
    const ministryId = this.form.controls.ministryId.value;
    const eventId = this.form.controls.calendarEventId.value;
    if (!ministryId) {
      this.memberOptions.set([]);
      this.#rebuildRows([]);
      return;
    }
    this.#loadMemberOptions(ministryId);
    if (eventId) {
      this.#applyMinistryRows(eventId, ministryId);
    }
  }

  addRow(): void {
    if (!this.canWrite()) {
      return;
    }
    this.rows.push(this.#createRow());
  }

  removeRow(index: number): void {
    if (!this.canWrite()) {
      return;
    }
    this.rows.removeAt(index);
  }

  submit(): void {
    if (!this.canWrite()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.#focusFirstInvalid();
      return;
    }

    const eventId = this.form.controls.calendarEventId.value;
    const ministryId = this.form.controls.ministryId.value;
    const items = this.rows.getRawValue().map((row) => ({
      memberId: row.memberId,
      roleLabel: row.roleLabel.trim(),
      confirmed: row.confirmed,
      notes: row.notes.trim() ? row.notes.trim() : null,
    }));

    const memberIds = items.map((item) => item.memberId);
    if (new Set(memberIds).size !== memberIds.length) {
      this.errorMessage.set(this.#translate.instant('ERRORS.SCHEDULES.ASSIGNMENT_CONFLICT'));
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.supportHint.set(null);

    this.#schedules
      .bulkUpsertAssignments(eventId, ministryId, { items })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
          this.onDialogClosed();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
          this.supportHint.set(resolved.supportHint ?? null);
        },
      });
  }

  #bootstrap(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.supportHint.set(null);

    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    const to = new Date(now);
    to.setDate(to.getDate() + 90);

    forkJoin({
      ministries: this.#ministries.list({ page: 1, limit: 100, status: MinistryStatus.ACTIVE }),
      events: this.#secretariat.calendarEvents({
        from: from.toISOString(),
        to: to.toISOString(),
        page: 1,
        limit: 100,
      }),
    })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: ({ ministries, events }) => {
          this.ministries.set(ministries.data);
          this.events.set(events.data);

          const selectedEventId = this.eventId() ?? '';
          const selectedMinistryId = this.ministryId() ?? '';

          this.form.patchValue({
            calendarEventId: selectedEventId,
            ministryId: selectedMinistryId,
          });

          if (selectedEventId) {
            this.#loadEventAssignments(selectedEventId, selectedMinistryId || undefined);
          } else {
            this.loading.set(false);
          }

          if (selectedMinistryId) {
            this.#loadMemberOptions(selectedMinistryId);
          }
        },
        error: (error: unknown) => {
          this.loading.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
          this.supportHint.set(resolved.supportHint ?? null);
        },
      });
  }

  #loadEventAssignments(eventId: string, preferredMinistryId?: string): void {
    this.loading.set(true);
    this.#schedules
      .listEventAssignments(eventId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (assignments) => {
          this.eventAssignments.set(assignments);
          const ministryId = preferredMinistryId || this.form.controls.ministryId.value;
          if (ministryId) {
            this.#applyMinistryRows(eventId, ministryId);
          } else {
            this.#rebuildRows([]);
          }
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.eventAssignments.set([]);
          this.#rebuildRows([]);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
          this.supportHint.set(resolved.supportHint ?? null);
        },
      });
  }

  #loadMemberOptions(ministryId: string): void {
    this.#schedules
      .memberOptions({ ministryId, limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (options) => this.memberOptions.set(options),
        error: () => this.memberOptions.set([]),
      });
  }

  #applyMinistryRows(_eventId: string, ministryId: string): void {
    const rows = this.eventAssignments().filter((item) => item.ministryId === ministryId);
    this.#rebuildRows(rows);
  }

  #rebuildRows(assignments: IScheduleAssignment[]): void {
    this.rows.clear();
    if (assignments.length === 0) {
      if (this.canWrite()) {
        this.rows.push(this.#createRow());
      }
      return;
    }
    for (const assignment of assignments) {
      this.rows.push(
        this.#createRow({
          memberId: assignment.memberId,
          roleLabel: assignment.roleLabel,
          confirmed: assignment.confirmed,
          notes: assignment.notes ?? '',
        }),
      );
    }
  }

  #createRow(values?: {
    memberId: string;
    roleLabel: string;
    confirmed: boolean;
    notes: string;
  }): AssignmentRowForm {
    return new FormGroup({
      memberId: new FormControl(values?.memberId ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      roleLabel: new FormControl(values?.roleLabel ?? '', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(80)],
      }),
      confirmed: new FormControl(values?.confirmed ?? false, { nonNullable: true }),
      notes: new FormControl(values?.notes ?? '', {
        nonNullable: true,
        validators: [Validators.maxLength(255)],
      }),
    });
  }

  #resetState(): void {
    this.form.reset({ calendarEventId: '', ministryId: '' });
    this.rows.clear();
    this.ministries.set([]);
    this.events.set([]);
    this.memberOptions.set([]);
    this.eventAssignments.set([]);
    this.errorMessage.set(null);
    this.supportHint.set(null);
    this.loading.set(false);
    this.saving.set(false);
  }

  #focusFirstInvalid(): void {
    queueMicrotask(() => {
      this.#host.nativeElement
        .querySelector<HTMLElement>('input.ng-invalid, select.ng-invalid, textarea.ng-invalid')
        ?.focus();
    });
  }
}
