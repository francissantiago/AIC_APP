import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppDialog } from '@components/app-dialog/app-dialog';
import { SocialProjectSessionForm } from '@components/social-projects/social-project-session-form/social-project-session-form';
import { TranslatePipe } from '@ngx-translate/core';
import { ISocialProject } from '@interfaces/ISocialProject';
import { ISocialProjectSession } from '@interfaces/ISocialProjectSession';
import { AuthService } from '@services/auth-service';
import { SocialProjectSessionsService } from '@services/social-project-sessions-service';
import { SocialProjectsService } from '@services/social-projects-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { DateInput } from '@components/date-input/date-input';
import { AppDatePipe } from '@pipes/app-date-pipe';

@Component({
  selector: 'app-social-project-sessions-list',
  imports: [AppDatePipe, AppDialog, DateInput, ReactiveFormsModule, SocialProjectSessionForm, TranslatePipe],
  templateUrl: './social-project-sessions-list.html',
  styleUrl: './social-project-sessions-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialProjectSessionsList implements OnInit {
  readonly #sessionsService = inject(SocialProjectSessionsService);
  readonly #projectsService = inject(SocialProjectsService);
  readonly #auth = inject(AuthService);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);

  readonly sessions = signal<ISocialProjectSession[]>([]);
  readonly projects = signal<ISocialProject[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly feedback = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly formProjectId = signal<string | null>(null);

  readonly totalPages = computed(() => {
    const pages = Math.ceil(this.total() / this.limit());
    return pages > 0 ? pages : 1;
  });

  readonly canWrite = computed(() => this.#auth.hasPermission('social-projects:write'));

  readonly filterForm = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    socialProjectId: new FormControl('', { nonNullable: true }),
    dateFrom: new FormControl('', { nonNullable: true }),
    dateTo: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadProjects();
    this.#loadSessions();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (prev, next) =>
            prev.q === next.q &&
            prev.socialProjectId === next.socialProjectId &&
            prev.dateFrom === next.dateFrom &&
            prev.dateTo === next.dateTo,
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.#loadSessions();
      });
  }

  openCreate(): void {
    const projectId = this.filterForm.controls.socialProjectId.value.trim();
    if (!projectId) {
      this.feedback.set('SOCIAL_PROJECTS.SELECT_PROJECT_FIRST');
      return;
    }
    this.formProjectId.set(projectId);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.formProjectId.set(null);
  }

  afterSave(): void {
    this.closeForm();
    this.feedback.set('SOCIAL_PROJECTS.SESSION_SAVE_SUCCESS');
    this.#loadSessions();
  }

  openAttendance(session: ISocialProjectSession): void {
    void this.#router.navigate(['/social-projects/sessions', session.id, 'attendance'], {
      queryParams: { projectId: session.socialProjectId },
    });
  }

  previousPage(): void {
    if (this.page() <= 1) return;
    this.page.update((value) => value - 1);
    this.#loadSessions();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((value) => value + 1);
    this.#loadSessions();
  }

  #loadProjects(): void {
    this.#projectsService
      .list({ page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.projects.set(response.data),
        error: () => this.projects.set([]),
      });
  }

  #loadSessions(): void {
    this.loading.set(true);
    this.error.set(false);
    const { q, socialProjectId, dateFrom, dateTo } = this.filterForm.getRawValue();

    this.#sessionsService
      .listGlobal({
        page: this.page(),
        limit: this.limit(),
        q: q.trim() || undefined,
        socialProjectId: socialProjectId.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.sessions.set(response.data);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
          this.loading.set(false);
        },
        error: () => {
          this.sessions.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
