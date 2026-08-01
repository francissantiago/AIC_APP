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
import { MissionFieldForm } from '@components/missions/mission-field-form/mission-field-form';
import { TranslatePipe } from '@ngx-translate/core';
import { ActionButtonVariant } from '@enums/action-button-variant';
import { MISSION_FIELD_STATUSES, MissionFieldStatus } from '@enums/mission-field-status';
import { IMissionField } from '@interfaces/IMissionField';
import { AuthService } from '@services/auth-service';
import { MissionFieldsService } from '@services/mission-fields-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-mission-fields-list',
  imports: [
    ActionButton,
    ActionButtonGroup,
    AppDialog,
    MissionFieldForm,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  templateUrl: './mission-fields-list.html',
  styleUrl: './mission-fields-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionFieldsList implements OnInit {
  readonly actionVariants = ActionButtonVariant;

  readonly #fieldsService = inject(MissionFieldsService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);

  readonly statuses = MISSION_FIELD_STATUSES;
  readonly fields = signal<IMissionField[]>([]);
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
    status: new FormControl<MissionFieldStatus | ''>('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadFields();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, next) => prev.q === next.q && prev.status === next.status),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.page.set(1);
        this.#loadFields();
      });
  }

  statusLabelKey(status: MissionFieldStatus): string {
    return `MISSIONS.FIELD_STATUS_${status.toUpperCase()}`;
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
    this.#loadFields();
  }

  previousPage(): void {
    if (this.page() <= 1) return;
    this.page.update((value) => value - 1);
    this.#loadFields();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((value) => value + 1);
    this.#loadFields();
  }

  askDelete(fieldId: string): void {
    this.closeForm();
    this.pendingDeleteId.set(fieldId);
    this.feedback.set(null);
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  confirmDelete(): void {
    const id = this.pendingDeleteId();
    if (!id) return;

    this.deleting.set(true);
    this.#fieldsService
      .remove(id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteId.set(null);
          this.feedback.set('MISSIONS.DELETE_SUCCESS');
          this.#loadFields();
        },
        error: () => {
          this.deleting.set(false);
          this.feedback.set('MISSIONS.DELETE_ERROR');
        },
      });
  }

  #loadFields(): void {
    this.loading.set(true);
    this.error.set(false);
    const { q, status } = this.filterForm.getRawValue();

    this.#fieldsService
      .list({
        page: this.page(),
        limit: this.limit(),
        q: q.trim() || undefined,
        status: status || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.fields.set(response.data);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
          this.loading.set(false);
        },
        error: () => {
          this.fields.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
