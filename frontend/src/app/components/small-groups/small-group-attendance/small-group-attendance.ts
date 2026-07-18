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
import { TranslatePipe } from '@ngx-translate/core';
import { ISmallGroupAttendanceEntry } from '@interfaces/ISmallGroupAttendance';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { SmallGroupsService } from '@services/small-groups-service';

type AttendanceDraft = {
  memberId: string;
  memberFullName: string;
  present: boolean | null;
  notes: string;
};

@Component({
  selector: 'app-small-group-attendance',
  imports: [TranslatePipe],
  templateUrl: './small-group-attendance.html',
  styleUrl: './small-group-attendance.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmallGroupAttendance {
  readonly #smallGroupsService = inject(SmallGroupsService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly groupId = input.required<string>();
  readonly meetingId = input.required<string>();

  readonly groupName = signal('');
  readonly meetingDate = signal('');
  readonly drafts = signal<AttendanceDraft[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal(false);
  readonly feedback = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly canWrite = computed(() => this.#auth.hasPermission('small-groups:write'));
  readonly isEmpty = computed(() => !this.loading() && !this.error() && this.drafts().length === 0);

  constructor() {
    effect(() => {
      this.groupId();
      this.meetingId();
      this.#loadSheet();
    });
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

  save(): void {
    if (!this.canWrite() || this.drafts().length === 0) {
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

    this.#smallGroupsService
      .saveMeetingAttendance(this.groupId(), this.meetingId(), { entries })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (sheet) => {
          this.saving.set(false);
          this.#applySheet(sheet.entries, sheet.smallGroupName, sheet.meetingDate);
          this.feedback.set('SMALL_GROUPS.ATTENDANCE_SAVE_SUCCESS');
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage || null);
          if (!resolved.displayMessage) {
            this.feedback.set('SMALL_GROUPS.ATTENDANCE_SAVE_ERROR');
          }
        },
      });
  }

  #loadSheet(): void {
    const groupId = this.groupId();
    const meetingId = this.meetingId();
    if (!groupId || !meetingId) {
      return;
    }

    this.loading.set(true);
    this.error.set(false);
    this.feedback.set(null);
    this.errorMessage.set(null);

    this.#smallGroupsService
      .getMeetingAttendance(groupId, meetingId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (sheet) => {
          this.loading.set(false);
          this.#applySheet(sheet.entries, sheet.smallGroupName, sheet.meetingDate);
        },
        error: () => {
          this.loading.set(false);
          this.drafts.set([]);
          this.groupName.set('');
          this.meetingDate.set('');
          this.error.set(true);
        },
      });
  }

  #applySheet(entries: ISmallGroupAttendanceEntry[], groupName: string, meetingDate: string): void {
    this.groupName.set(groupName);
    this.meetingDate.set(meetingDate);
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
