import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ISmallGroup } from '@interfaces/ISmallGroup';
import { ISmallGroupFrequencyReport } from '@interfaces/ISmallGroupFrequencyReport';
import { ApiErrorService } from '@services/api-error.service';
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
  readonly #apiError = inject(ApiErrorService);
  readonly #route = inject(ActivatedRoute);
  readonly #document = inject(DOCUMENT);
  readonly #destroyRef = inject(DestroyRef);

  readonly groups = signal<ISmallGroup[]>([]);
  readonly report = signal<ISmallGroupFrequencyReport | null>(null);
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly error = signal(false);
  readonly errorMessage = signal<string | null>(null);

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
      .frequencyReport(groupId, { from, to })
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
      .frequencyCsv(groupId, { from, to })
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
    this.#smallGroupsService
      .list({ page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.groups.set(response.data);
          if (!this.filterForm.controls.groupId.value && response.data[0]) {
            this.filterForm.controls.groupId.setValue(response.data[0].id);
          }
        },
        error: () => this.groups.set([]),
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
