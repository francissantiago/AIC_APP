import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ISocialProjectAttendanceEntry } from '@interfaces/ISocialProjectAttendance';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { SocialProjectSessionsService } from '@services/social-project-sessions-service';

type AttendanceDraft = {
  memberId: string;
  memberFullName: string;
  present: boolean | null;
  notes: string;
};

@Component({
  selector: 'app-social-project-attendance',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './social-project-attendance.html',
  styleUrl: './social-project-attendance.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialProjectAttendance implements OnInit {
  readonly #sessionsService = inject(SocialProjectSessionsService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #route = inject(ActivatedRoute);
  readonly #destroyRef = inject(DestroyRef);

  readonly projectId = input<string | null>(null);
  readonly sessionId = input<string | null>(null);

  readonly resolvedProjectId = signal<string | null>(null);
  readonly resolvedSessionId = signal<string | null>(null);
  readonly projectName = signal('');
  readonly sessionDate = signal('');
  readonly sessionTitle = signal('');
  readonly drafts = signal<AttendanceDraft[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal(false);
  readonly feedback = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly routeMode = signal(false);

  readonly canWrite = computed(() => this.#auth.hasPermission('social-projects:write'));
  readonly isEmpty = computed(() => !this.loading() && !this.error() && this.drafts().length === 0);

  constructor() {
    effect(() => {
      const projectId = this.projectId();
      const sessionId = this.sessionId();
      if (projectId && sessionId) {
        this.resolvedProjectId.set(projectId);
        this.resolvedSessionId.set(sessionId);
        this.#loadSheet();
      }
    });
  }

  ngOnInit(): void {
    if (this.projectId() && this.sessionId()) {
      return;
    }

    this.routeMode.set(true);
    this.#route.paramMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      this.resolvedSessionId.set(params.get('sessionId'));
      this.#loadSheet();
    });

    this.#route.queryParamMap.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((params) => {
      this.resolvedProjectId.set(params.get('projectId'));
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
    const projectId = this.resolvedProjectId();
    const sessionId = this.resolvedSessionId();
    if (!this.canWrite() || !projectId || !sessionId || this.drafts().length === 0) {
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

    this.#sessionsService
      .saveAttendance(projectId, sessionId, { entries })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (sheet) => {
          this.saving.set(false);
          this.#applySheet(
            sheet.entries,
            sheet.socialProjectName,
            sheet.sessionDate,
            sheet.sessionTitle,
          );
          this.feedback.set('SOCIAL_PROJECTS.ATTENDANCE_SAVE_SUCCESS');
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage || null);
          if (!resolved.displayMessage) {
            this.feedback.set('SOCIAL_PROJECTS.ATTENDANCE_SAVE_ERROR');
          }
        },
      });
  }

  #loadSheet(): void {
    const projectId = this.resolvedProjectId();
    const sessionId = this.resolvedSessionId();
    if (!projectId || !sessionId) {
      return;
    }

    this.loading.set(true);
    this.error.set(false);
    this.feedback.set(null);
    this.errorMessage.set(null);

    this.#sessionsService
      .getAttendance(projectId, sessionId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (sheet) => {
          this.loading.set(false);
          this.#applySheet(
            sheet.entries,
            sheet.socialProjectName,
            sheet.sessionDate,
            sheet.sessionTitle,
          );
        },
        error: () => {
          this.loading.set(false);
          this.drafts.set([]);
          this.projectName.set('');
          this.sessionDate.set('');
          this.sessionTitle.set('');
          this.error.set(true);
        },
      });
  }

  #applySheet(
    entries: ISocialProjectAttendanceEntry[],
    projectName: string,
    sessionDate: string,
    sessionTitle: string,
  ): void {
    this.projectName.set(projectName);
    this.sessionDate.set(sessionDate);
    this.sessionTitle.set(sessionTitle);
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
