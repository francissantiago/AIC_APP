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
import { MissionBookletForm } from '@components/missions/mission-booklet-form/mission-booklet-form';
import { MissionBookletInstallmentsPanel } from '@components/missions/mission-booklet-installments-panel/mission-booklet-installments-panel';
import { TranslatePipe } from '@ngx-translate/core';
import {
  MISSION_BOOKLET_DESTINATION_TYPES,
  MissionBookletDestinationType,
} from '@enums/mission-booklet-destination-type';
import {
  MISSION_BOOKLET_STATUSES,
  MissionBookletStatus,
} from '@enums/mission-booklet-status';
import { IMissionBooklet } from '@interfaces/IMissionBooklet';
import { AuthService } from '@services/auth-service';
import { MissionBookletsService } from '@services/mission-booklets-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-mission-booklets-list',
  imports: [
    AppDialog,
    MissionBookletForm,
    MissionBookletInstallmentsPanel,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  templateUrl: './mission-booklets-list.html',
  styleUrl: './mission-booklets-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionBookletsList implements OnInit {
  readonly #bookletsService = inject(MissionBookletsService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);

  readonly statuses = MISSION_BOOKLET_STATUSES;
  readonly destinationTypes = MISSION_BOOKLET_DESTINATION_TYPES;
  readonly BookletStatus = MissionBookletStatus;

  readonly booklets = signal<IMissionBooklet[]>([]);
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
  readonly installmentsBooklet = signal<IMissionBooklet | null>(null);

  readonly totalPages = computed(() => {
    const pages = Math.ceil(this.total() / this.limit());
    return pages > 0 ? pages : 1;
  });

  readonly canWrite = computed(() => this.#auth.hasPermission('missions:write'));

  readonly filterForm = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    status: new FormControl<MissionBookletStatus | ''>('', { nonNullable: true }),
    destinationType: new FormControl<MissionBookletDestinationType | ''>('', {
      nonNullable: true,
    }),
  });

  ngOnInit(): void {
    this.#loadBooklets();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(
          (prev, next) =>
            prev.q === next.q &&
            prev.status === next.status &&
            prev.destinationType === next.destinationType,
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.#loadBooklets();
      });
  }

  statusLabelKey(status: MissionBookletStatus): string {
    return `MISSIONS.BOOKLETS.STATUS_${status.toUpperCase()}`;
  }

  destinationLabelKey(type: MissionBookletDestinationType): string {
    return `MISSIONS.BOOKLETS.DESTINATION_${type.toUpperCase()}`;
  }

  destinationLabel(booklet: IMissionBooklet): string {
    if (booklet.destinationType === MissionBookletDestinationType.FIELD) {
      return booklet.missionFieldName ?? '';
    }
    if (booklet.destinationType === MissionBookletDestinationType.ASSIGNMENT) {
      return booklet.missionAssignmentLabel ?? '';
    }
    return '';
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
    this.#loadBooklets();
  }

  openInstallments(booklet: IMissionBooklet): void {
    this.installmentsBooklet.set(booklet);
  }

  closeInstallments(): void {
    this.installmentsBooklet.set(null);
  }

  afterInstallmentsChange(): void {
    this.#loadBooklets();
  }

  previousPage(): void {
    if (this.page() <= 1) return;
    this.page.update((value) => value - 1);
    this.#loadBooklets();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((value) => value + 1);
    this.#loadBooklets();
  }

  askDelete(bookletId: string): void {
    this.closeForm();
    this.closeInstallments();
    this.pendingDeleteId.set(bookletId);
    this.feedback.set(null);
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  confirmDelete(): void {
    const id = this.pendingDeleteId();
    if (!id) return;

    this.deleting.set(true);
    this.#bookletsService
      .remove(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteId.set(null);
          this.feedback.set('MISSIONS.DELETE_SUCCESS');
          this.#loadBooklets();
        },
        error: () => {
          this.deleting.set(false);
          this.feedback.set('MISSIONS.DELETE_ERROR');
        },
      });
  }

  #loadBooklets(): void {
    this.loading.set(true);
    this.error.set(false);
    const { q, status, destinationType } = this.filterForm.getRawValue();

    this.#bookletsService
      .list({
        page: this.page(),
        limit: this.limit(),
        q: q.trim() || undefined,
        status: status || undefined,
        destinationType: destinationType || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.booklets.set(response.data);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
          this.loading.set(false);
        },
        error: () => {
          this.booklets.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
