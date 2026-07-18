import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { IClassAttendanceEntry } from '@interfaces/IClassAttendanceEntry';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { ClassesService } from '@services/classes-service';

type AttendanceDraft = {
  memberId: string;
  memberFullName: string;
  present: boolean | null;
  notes: string;
};

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-class-attendance',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './class-attendance.html',
  styleUrl: './class-attendance.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassAttendance {
  readonly #classesService = inject(ClassesService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly classId = input.required<string>();
  readonly sessionDate = input<string | null>(null);

  readonly className = signal('');
  readonly drafts = signal<AttendanceDraft[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal(false);
  readonly feedback = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly canWrite = computed(() => this.#auth.hasPermission('classes:write'));
  readonly isEmpty = computed(() => !this.loading() && !this.error() && this.drafts().length === 0);

  readonly sessionForm = new FormGroup({
    sessionDate: new FormControl(todayIsoDate(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {
    effect(() => {
      const externalDate = this.sessionDate();
      if (externalDate) {
        this.sessionForm.controls.sessionDate.setValue(externalDate, { emitEvent: false });
      }
      this.classId();
      this.#loadSheet();
    });

    this.sessionForm.controls.sessionDate.valueChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#loadSheet());
  }

  setPresent(memberId: string, present: boolean): void {
    if (!this.canWrite()) {
      return;
    }
    this.drafts.update((list) =>
      list.map((entry) => (entry.memberId === memberId ? { ...entry, present } : entry)),
    );
  }

  onNotesChange(memberId: string, event: Event): void {
    if (!this.canWrite()) {
      return;
    }
    const notes = (event.target as HTMLInputElement).value;
    this.drafts.update((list) =>
      list.map((entry) => (entry.memberId === memberId ? { ...entry, notes } : entry)),
    );
  }

  reload(): void {
    this.#loadSheet();
  }

  save(): void {
    if (!this.canWrite() || this.drafts().length === 0) {
      return;
    }

    const sessionDate = this.sessionForm.controls.sessionDate.value;
    if (!sessionDate) {
      this.sessionForm.markAllAsTouched();
      return;
    }

    const entries = this.drafts().map((entry) => ({
      memberId: entry.memberId,
      present: entry.present ?? false,
      notes: entry.notes.trim() ? entry.notes.trim() : null,
    }));

    this.saving.set(true);
    this.feedback.set(null);
    this.errorMessage.set(null);

    this.#classesService
      .saveSessionAttendance(this.classId(), { sessionDate, entries })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (sheet) => {
          this.saving.set(false);
          this.#applySheet(sheet.entries, sheet.className, sheet.sessionDate);
          this.feedback.set('EBD_ATTENDANCE.SAVE_SUCCESS');
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage || null);
          if (!resolved.displayMessage) {
            this.feedback.set('EBD_ATTENDANCE.SAVE_ERROR');
          }
        },
      });
  }

  #loadSheet(): void {
    const classId = this.classId();
    const sessionDate = this.sessionForm.controls.sessionDate.value;
    if (!classId || !sessionDate) {
      return;
    }

    this.loading.set(true);
    this.error.set(false);
    this.feedback.set(null);
    this.errorMessage.set(null);

    this.#classesService
      .getSessionAttendance(classId, sessionDate)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (sheet) => {
          this.loading.set(false);
          this.#applySheet(sheet.entries, sheet.className, sheet.sessionDate);
        },
        error: () => {
          this.loading.set(false);
          this.drafts.set([]);
          this.className.set('');
          this.error.set(true);
        },
      });
  }

  #applySheet(entries: IClassAttendanceEntry[], className: string, sessionDate: string): void {
    this.className.set(className);
    this.sessionForm.controls.sessionDate.setValue(sessionDate, { emitEvent: false });
    this.drafts.set(
      entries.map((entry) => ({
        memberId: entry.memberId,
        memberFullName: entry.memberFullName,
        present: entry.present,
        notes: entry.notes ?? '',
      })),
    );
  }
}
