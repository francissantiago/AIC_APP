import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AppDialog } from '@components/app-dialog/app-dialog';
import { CongregationType } from '@enums/congregation-type';
import { CongregationStatus } from '@enums/congregation-status';
import { ICongregation } from '@interfaces/ICongregation';
import { ApiErrorService } from '@services/api-error.service';
import { CongregationsService } from '@services/congregations-service';
import { UserCongregationsService } from '@services/user-congregations-service';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-user-congregations-dialog',
  imports: [AppDialog, ReactiveFormsModule, TranslatePipe],
  templateUrl: './user-congregations-dialog.html',
  styleUrl: './user-congregations-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCongregationsDialog {
  readonly #userCongregations = inject(UserCongregationsService);
  readonly #congregationsService = inject(CongregationsService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly userId = input.required<string>();
  readonly userDisplayName = input<string | null>(null);
  readonly open = model(false);
  readonly saved = output<void>();
  readonly closed = output<void>();

  readonly congregations = signal<ICongregation[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal(false);
  readonly feedbackKey = signal<string | null>(null);
  readonly validationKey = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly dialogTitle = computed(() => 'USERS.CONGREGATIONS_DIALOG_TITLE');

  readonly form = new FormGroup({
    selectedIds: new FormControl<string[]>([], { nonNullable: true }),
    defaultCongregationId: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      if (!this.open() || !this.userId()) {
        return;
      }
      this.#loadData();
    });
  }

  congregationTypeLabel(type: CongregationType): string {
    return type === CongregationType.HEADQUARTERS
      ? 'CONGREGATION.TYPE_HEADQUARTERS'
      : 'CONGREGATION.TYPE_BRANCH';
  }

  isSelected(congregationId: string): boolean {
    return this.form.controls.selectedIds.value.includes(congregationId);
  }

  toggleCongregation(congregationId: string, checked: boolean): void {
    const current = [...this.form.controls.selectedIds.value];
    const defaultId = this.form.controls.defaultCongregationId.value;

    if (checked) {
      if (!current.includes(congregationId)) {
        current.push(congregationId);
      }
      if (!defaultId || !current.includes(defaultId)) {
        this.form.controls.defaultCongregationId.setValue(congregationId);
      }
    } else {
      const next = current.filter((id) => id !== congregationId);
      this.form.controls.selectedIds.setValue(next);
      if (defaultId === congregationId) {
        this.form.controls.defaultCongregationId.setValue(next[0] ?? '');
      }
      return;
    }

    this.form.controls.selectedIds.setValue(current);
    this.validationKey.set(null);
  }

  selectDefault(congregationId: string): void {
    if (!this.isSelected(congregationId)) {
      return;
    }
    this.form.controls.defaultCongregationId.setValue(congregationId);
    this.validationKey.set(null);
  }

  close(): void {
    this.open.set(false);
    this.feedbackKey.set(null);
    this.validationKey.set(null);
    this.errorMessage.set(null);
    this.closed.emit();
  }

  save(): void {
    const selectedIds = this.form.controls.selectedIds.value;
    const defaultCongregationId = this.form.controls.defaultCongregationId.value;

    if (selectedIds.length === 0) {
      this.validationKey.set('USERS.CONGREGATIONS_ERROR_MIN_ONE');
      return;
    }

    if (!defaultCongregationId || !selectedIds.includes(defaultCongregationId)) {
      this.validationKey.set('USERS.CONGREGATIONS_ERROR_DEFAULT');
      return;
    }

    this.saving.set(true);
    this.validationKey.set(null);
    this.errorMessage.set(null);
    this.feedbackKey.set(null);

    this.#userCongregations
      .setForUser(this.userId(), {
        congregationIds: selectedIds,
        defaultCongregationId,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.feedbackKey.set('USERS.CONGREGATIONS_SUCCESS');
          this.saved.emit();
          this.open.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
        },
      });
  }

  #loadData(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.validationKey.set(null);
    this.errorMessage.set(null);
    this.feedbackKey.set(null);

    forkJoin({
      memberships: this.#userCongregations.listForUser(this.userId()),
      congregations: this.#congregationsService.findAll({
        limit: 100,
        status: CongregationStatus.ACTIVE,
      }),
    })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: ({ memberships, congregations }) => {
          this.congregations.set(congregations.data);
          const selectedIds = memberships.map((item) => item.congregationId);
          const defaultMembership =
            memberships.find((item) => item.isDefault) ?? memberships[0] ?? null;

          this.form.setValue({
            selectedIds,
            defaultCongregationId: defaultMembership?.congregationId ?? selectedIds[0] ?? '',
          });
          this.loading.set(false);
        },
        error: () => {
          this.congregations.set([]);
          this.form.setValue({ selectedIds: [], defaultCongregationId: '' });
          this.loading.set(false);
          this.loadError.set(true);
        },
      });
  }
}
