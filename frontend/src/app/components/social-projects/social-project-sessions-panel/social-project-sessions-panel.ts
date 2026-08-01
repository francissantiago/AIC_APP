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
import { AppDialog } from '@components/app-dialog/app-dialog';
import { ActionButton } from '@components/action-button/action-button';
import { ActionButtonGroup } from '@components/action-button-group/action-button-group';
import { SocialProjectAttendance } from '@components/social-projects/social-project-attendance/social-project-attendance';
import { SocialProjectSessionForm } from '@components/social-projects/social-project-session-form/social-project-session-form';
import { TranslatePipe } from '@ngx-translate/core';
import { ActionButtonVariant } from '@enums/action-button-variant';
import { ISocialProjectSession } from '@interfaces/ISocialProjectSession';
import { ApiErrorService } from '@services/api-error.service';
import { AuthService } from '@services/auth-service';
import { SocialProjectSessionsService } from '@services/social-project-sessions-service';
import { AppDatePipe } from '@pipes/app-date-pipe';

@Component({
  selector: 'app-social-project-sessions-panel',
  imports: [
    ActionButton,
    ActionButtonGroup,
    AppDatePipe,
    AppDialog,
    SocialProjectAttendance,
    SocialProjectSessionForm,
    TranslatePipe,
  ],
  templateUrl: './social-project-sessions-panel.html',
  styleUrl: './social-project-sessions-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialProjectSessionsPanel implements OnInit {
  readonly actionVariants = ActionButtonVariant;

  readonly #sessionsService = inject(SocialProjectSessionsService);
  readonly #auth = inject(AuthService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly projectId = input.required<string>();

  readonly sessions = signal<ISocialProjectSession[]>([]);
  readonly loading = signal(false);
  readonly deleting = signal(false);
  readonly error = signal(false);
  readonly feedback = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly editingSession = signal<ISocialProjectSession | null>(null);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly takingAttendanceSessionId = signal<string | null>(null);

  readonly canWrite = computed(() => this.#auth.hasPermission('social-projects:write'));

  ngOnInit(): void {
    this.#loadSessions();
  }

  openCreate(): void {
    this.editingSession.set(null);
    this.pendingDeleteId.set(null);
    this.takingAttendanceSessionId.set(null);
    this.showForm.set(true);
  }

  openEdit(session: ISocialProjectSession): void {
    this.editingSession.set(session);
    this.pendingDeleteId.set(null);
    this.takingAttendanceSessionId.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingSession.set(null);
  }

  afterSave(): void {
    this.closeForm();
    this.feedback.set('SOCIAL_PROJECTS.SESSION_SAVE_SUCCESS');
    this.#loadSessions();
  }

  openAttendance(sessionId: string): void {
    this.takingAttendanceSessionId.set(sessionId);
    this.showForm.set(false);
    this.pendingDeleteId.set(null);
  }

  closeAttendance(): void {
    this.takingAttendanceSessionId.set(null);
  }

  askDelete(session: ISocialProjectSession): void {
    this.pendingDeleteId.set(session.id);
    this.takingAttendanceSessionId.set(null);
    this.feedback.set(null);
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  confirmDelete(): void {
    const sessionId = this.pendingDeleteId();
    if (!sessionId || !this.canWrite()) {
      return;
    }

    this.deleting.set(true);
    this.errorMessage.set(null);

    this.#sessionsService
      .remove(this.projectId(), sessionId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteId.set(null);
          this.feedback.set('SOCIAL_PROJECTS.SESSION_DELETE_SUCCESS');
          this.#loadSessions();
        },
        error: (error: HttpErrorResponse) => {
          this.deleting.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
        },
      });
  }

  deleteConfirmTitle(session: ISocialProjectSession): string {
    return session.title;
  }

  #loadSessions(): void {
    this.loading.set(true);
    this.error.set(false);

    this.#sessionsService
      .listByProject(this.projectId(), { page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.sessions.set(response.data);
          this.loading.set(false);
        },
        error: () => {
          this.sessions.set([]);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
