import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CongregationType } from '@enums/congregation-type';
import { CongregationStatus } from '@enums/congregation-status';
import { reportScopeParam } from '@enums/report-scope';
import { ISmallGroup } from '@interfaces/ISmallGroup';
import { ISmallGroupFrequencyReport } from '@interfaces/ISmallGroupFrequencyReport';
import { ApiErrorService } from '@services/api-error.service';
import { CongregationContextService } from '@services/congregation-context-service';
import { CongregationsService } from '@services/congregations-service';
import { SmallGroupsService } from '@services/small-groups-service';

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthStartIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

@Component({
  selector: 'app-small-group-frequency-report',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './small-group-frequency-report.html',
  styleUrl: './small-group-frequency-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmallGroupFrequencyReport implements OnInit {
  readonly #smallGroupsService = inject(SmallGroupsService);
  readonly #congregationsService = inject(CongregationsService);
  readonly #context = inject(CongregationContextService);
  readonly #apiError = inject(ApiErrorService);
  readonly #route = inject(ActivatedRoute);
  readonly #document = inject(DOCUMENT);
  readonly #destroyRef = inject(DestroyRef);

  readonly groups = signal<ISmallGroup[]>([]);
  readonly congregationNames = signal<Record<string, string>>({});
  readonly report = signal<ISmallGroupFrequencyReport | null>(null);
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly error = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly consolidatedScope = signal(false);
  readonly canShowConsolidatedToggle = computed(
    () => this.#context.activeMembership()?.congregationType === CongregationType.HEADQUARTERS,
  );

  constructor() {
    effect(() => {
      const version = this.#context.contextVersion();
      if (version === 0) {
        return;
      }
      this.consolidatedScope.set(false);
      this.report.set(null);
      this.#loadGroups();
    });
  }

  readonly filterForm = new FormGroup({
    groupId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    from: new FormControl(monthStartIsoDate(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    to: new FormControl(todayIsoDate(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  ngOnInit(): void {
    const queryGroupId = this.#route.snapshot.queryParamMap.get('groupId');
    if (queryGroupId) {
      this.filterForm.controls.groupId.setValue(queryGroupId);
    }

    this.#loadGroups();
  }

  toggleConsolidated(checked: boolean): void {
    this.consolidatedScope.set(checked);
    this.report.set(null);
    this.#loadGroups();
  }

  groupOptionLabel(group: ISmallGroup): string {
    if (!this.consolidatedScope()) {
      return group.name;
    }
    const congregationName = this.congregationNames()[group.congregationId];
    return congregationName ? `${group.name} (${congregationName})` : group.name;
  }

  loadReport(): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }

    const { groupId, from, to } = this.filterForm.getRawValue();
    this.loading.set(true);
    this.error.set(false);
    this.errorMessage.set(null);

    this.#smallGroupsService
      .frequencyReport(groupId, {
        from,
        to,
        scope: reportScopeParam(this.consolidatedScope()),
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (result) => {
          this.report.set(result);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.report.set(null);
          this.loading.set(false);
          this.error.set(true);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
        },
      });
  }

  exportCsv(): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }

    const { groupId, from, to } = this.filterForm.getRawValue();
    this.exporting.set(true);
    this.error.set(false);
    this.errorMessage.set(null);

    this.#smallGroupsService
      .frequencyCsv(groupId, {
        from,
        to,
        scope: reportScopeParam(this.consolidatedScope()),
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (blob) => {
          this.#downloadBlob(blob, `small-group-frequency-${groupId}-${from}-${to}.csv`);
          this.exporting.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.exporting.set(false);
          this.error.set(true);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
        },
      });
  }

  #loadGroups(): void {
    const scope = reportScopeParam(this.consolidatedScope());

    this.#smallGroupsService
      .list({ page: 1, limit: 100, scope })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.groups.set(response.data);
          const currentGroupId = this.filterForm.controls.groupId.value;
          const stillValid = response.data.some((item) => item.id === currentGroupId);
          if (!stillValid) {
            this.filterForm.controls.groupId.setValue(response.data[0]?.id ?? '');
          }
          if (this.consolidatedScope()) {
            this.#loadCongregationNames();
          } else {
            this.congregationNames.set({});
          }
        },
        error: () => {
          this.groups.set([]);
          this.congregationNames.set({});
        },
      });
  }

  #loadCongregationNames(): void {
    this.#congregationsService
      .findAll({ limit: 100, status: CongregationStatus.ACTIVE })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          const names = Object.fromEntries(response.data.map((item) => [item.id, item.name]));
          this.congregationNames.set(names);
        },
        error: () => this.congregationNames.set({}),
      });
  }

  #downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = this.#document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
