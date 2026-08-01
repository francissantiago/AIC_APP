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
import { AppDialog } from '@components/app-dialog/app-dialog';
import { ActionButton } from '@components/action-button/action-button';
import { ActionButtonGroup } from '@components/action-button-group/action-button-group';
import { MissionAssignmentForm } from '@components/missions/mission-assignment-form/mission-assignment-form';
import { TranslatePipe } from '@ngx-translate/core';
import { ActionButtonVariant } from '@enums/action-button-variant';
import { MISSION_ASSIGNMENT_ROLES, MissionAssignmentRole } from '@enums/mission-assignment-role';
import {
  MISSION_ASSIGNMENT_STATUSES,
  MissionAssignmentStatus,
} from '@enums/mission-assignment-status';
import { IMissionAssignment } from '@interfaces/IMissionAssignment';
import { AuthService } from '@services/auth-service';
import { MissionAssignmentsService } from '@services/mission-assignments-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AppDatePipe } from '@pipes/app-date-pipe';

@Component({
  selector: 'app-mission-assignments-list',
  imports: [
    AppDatePipe,
    ActionButton,
    ActionButtonGroup,
    AppDialog,
    MissionAssignmentForm,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  templateUrl: './mission-assignments-list.html',
  styleUrl: './mission-assignments-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionAssignmentsList implements OnInit {
  readonly actionVariants = ActionButtonVariant;

  readonly #assignmentsService = inject(MissionAssignmentsService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);

  readonly roles = MISSION_ASSIGNMENT_ROLES;
  readonly statuses = MISSION_ASSIGNMENT_STATUSES;
  readonly assignments = signal<IMissionAssignment[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly deleting = signal(false);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);

  readonly totalPages = computed(() => {
    const pages = Math.ceil(this.total() / this.limit());
    return pages > 0 ? pages : 1;
  });

  readonly canWrite = computed(() => this.#auth.hasPermission('missions:write'));

  readonly filterForm = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    status: new FormControl<MissionAssignmentStatus | ''>('', { nonNullable: true }),
    role: new FormControl<MissionAssignmentRole | ''>('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadAssignments();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (prev, next) =>
            prev.q === next.q && prev.status === next.status && prev.role === next.role,
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.#loadAssignments();
      });
  }

  roleLabelKey(role: MissionAssignmentRole): string {
    return `MISSIONS.ROLE_${role.toUpperCase()}`;
  }

  statusLabelKey(status: MissionAssignmentStatus): string {
    return `MISSIONS.STATUS_${status.toUpperCase()}`;
  }

  openCreate(): void {
    this.editingId.set(null);
    this.pendingDeleteId.set(null);
    this.showForm.set(true);
  }

  openEdit(id: string): void {
    this.editingId.set(id);
    this.pendingDeleteId.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  afterSave(): void {
    this.closeForm();
    this.feedback.set('MISSIONS.SAVE_SUCCESS');
    this.#loadAssignments();
  }

  previousPage(): void {
    if (this.page() <= 1) return;
    this.page.update((value) => value - 1);
    this.#loadAssignments();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((value) => value + 1);
    this.#loadAssignments();
  }

  askDelete(id: string): void {
    this.closeForm();
    this.pendingDeleteId.set(id);
    this.feedback.set(null);
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  confirmDelete(): void {
    const id = this.pendingDeleteId();
    if (!id) return;

    this.deleting.set(true);
    this.#assignmentsService
      .remove(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteId.set(null);
          this.feedback.set('MISSIONS.DELETE_SUCCESS');
          this.#loadAssignments();
        },
        error: () => {
          this.deleting.set(false);
          this.feedback.set('MISSIONS.DELETE_ERROR');
        },
      });
  }

  #loadAssignments(): void {
    this.loading.set(true);
    this.error.set(false);
    const { q, status, role } = this.filterForm.getRawValue();

    this.#assignmentsService
      .list({
        page: this.page(),
        limit: this.limit(),
        q: q.trim() || undefined,
        status: status || undefined,
        role: role || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.assignments.set(response.data);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
          this.loading.set(false);
        },
        error: () => {
          this.assignments.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
