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
import { SmallGroupAttendance } from '@components/small-groups/small-group-attendance/small-group-attendance';
import { TranslatePipe } from '@ngx-translate/core';
import { ISmallGroupMeeting } from '@interfaces/ISmallGroupMeeting';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { SmallGroupsService } from '@services/small-groups-service';

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-small-group-meetings-panel',
  imports: [ReactiveFormsModule, SmallGroupAttendance, TranslatePipe],
  templateUrl: './small-group-meetings-panel.html',
  styleUrl: './small-group-meetings-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmallGroupMeetingsPanel implements OnInit {
  readonly #smallGroupsService = inject(SmallGroupsService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly groupId = input.required<string>();

  readonly meetings = signal<ISmallGroupMeeting[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly error = signal(false);
  readonly feedback = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly editingMeetingId = signal<string | null>(null);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly takingAttendanceId = signal<string | null>(null);

  readonly canWrite = computed(() => this.#auth.hasPermission('small-groups:write'));

  readonly meetingForm = new FormGroup({
    meetingDate: new FormControl(todayIsoDate(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    theme: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(255)],
    }),
    notes: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
  });

  ngOnInit(): void {
    this.#loadMeetings();
  }

  startEdit(meeting: ISmallGroupMeeting): void {
    this.editingMeetingId.set(meeting.id);
    this.takingAttendanceId.set(null);
    this.pendingDeleteId.set(null);
    this.meetingForm.reset({
      meetingDate: meeting.meetingDate,
      theme: meeting.theme ?? '',
      notes: meeting.notes ?? '',
    });
  }

  cancelEdit(): void {
    this.editingMeetingId.set(null);
    this.meetingForm.reset({
      meetingDate: todayIsoDate(),
      theme: '',
      notes: '',
    });
  }

  submitMeeting(): void {
    if (!this.canWrite() || this.meetingForm.invalid) {
      this.meetingForm.markAllAsTouched();
      return;
    }

    const raw = this.meetingForm.getRawValue();
    const editingId = this.editingMeetingId();
    this.saving.set(true);
    this.feedback.set(null);
    this.errorMessage.set(null);

    if (editingId) {
      this.#smallGroupsService
        .updateMeeting(this.groupId(), editingId, {
          meetingDate: raw.meetingDate,
          theme: raw.theme.trim() || null,
          notes: raw.notes.trim() || null,
        })
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.editingMeetingId.set(null);
            this.feedback.set('SMALL_GROUPS.MEETING_SAVE_SUCCESS');
            this.meetingForm.reset({
              meetingDate: todayIsoDate(),
              theme: '',
              notes: '',
            });
            this.#loadMeetings();
          },
          error: (error: HttpErrorResponse) => {
            this.saving.set(false);
            const resolved = this.#apiError.resolve(error);
            this.errorMessage.set(resolved.displayMessage);
          },
        });
      return;
    }

    this.#smallGroupsService
      .createMeeting(this.groupId(), {
        meetingDate: raw.meetingDate,
        theme: raw.theme.trim() || undefined,
        notes: raw.notes.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.feedback.set('SMALL_GROUPS.MEETING_SAVE_SUCCESS');
          this.meetingForm.reset({
            meetingDate: todayIsoDate(),
            theme: '',
            notes: '',
          });
          this.#loadMeetings();
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
        },
      });
  }

  askDelete(meetingId: string): void {
    this.pendingDeleteId.set(meetingId);
    this.takingAttendanceId.set(null);
    this.feedback.set(null);
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  confirmDelete(): void {
    const meetingId = this.pendingDeleteId();
    if (!meetingId || !this.canWrite()) {
      return;
    }

    this.deleting.set(true);
    this.errorMessage.set(null);

    this.#smallGroupsService
      .removeMeeting(this.groupId(), meetingId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteId.set(null);
          this.feedback.set('SMALL_GROUPS.MEETING_DELETE_SUCCESS');
          this.#loadMeetings();
        },
        error: (error: HttpErrorResponse) => {
          this.deleting.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
        },
      });
  }

  openAttendance(meetingId: string): void {
    this.takingAttendanceId.set(meetingId);
    this.editingMeetingId.set(null);
    this.pendingDeleteId.set(null);
  }

  closeAttendance(): void {
    this.takingAttendanceId.set(null);
  }

  #loadMeetings(): void {
    this.loading.set(true);
    this.error.set(false);

    this.#smallGroupsService
      .listMeetings(this.groupId(), { page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.meetings.set(response.data);
          this.loading.set(false);
        },
        error: () => {
          this.meetings.set([]);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
