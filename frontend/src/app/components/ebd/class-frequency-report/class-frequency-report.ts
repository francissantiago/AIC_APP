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
import { IClassFrequencyReport } from '@interfaces/IClassFrequencyReport';
import { IEbdClass } from '@interfaces/IEbdClass';
import { ApiErrorService } from '@services/api-error.service';
import { ClassesService } from '@services/classes-service';

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
  selector: 'app-class-frequency-report',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './class-frequency-report.html',
  styleUrl: './class-frequency-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassFrequencyReport implements OnInit {
  readonly #classesService = inject(ClassesService);
  readonly #apiError = inject(ApiErrorService);
  readonly #route = inject(ActivatedRoute);
  readonly #document = inject(DOCUMENT);
  readonly #destroyRef = inject(DestroyRef);

  readonly classes = signal<IEbdClass[]>([]);
  readonly report = signal<IClassFrequencyReport | null>(null);
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly error = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly filterForm = new FormGroup({
    classId: new FormControl('', {
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
    const queryClassId = this.#route.snapshot.queryParamMap.get('classId');
    if (queryClassId) {
      this.filterForm.controls.classId.setValue(queryClassId);
    }

    this.#loadClasses();
  }

  loadReport(): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }

    const { classId, from, to } = this.filterForm.getRawValue();
    this.loading.set(true);
    this.error.set(false);
    this.errorMessage.set(null);

    this.#classesService
      .frequencyReport(classId, { from, to })
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

    const { classId, from, to } = this.filterForm.getRawValue();
    this.exporting.set(true);
    this.error.set(false);
    this.errorMessage.set(null);

    this.#classesService
      .frequencyCsv(classId, { from, to })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (blob) => {
          this.#downloadBlob(blob, `ebd-frequency-${classId}-${from}-${to}.csv`);
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

  #loadClasses(): void {
    this.#classesService
      .list({ page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.classes.set(response.data);
          if (!this.filterForm.controls.classId.value && response.data[0]) {
            this.filterForm.controls.classId.setValue(response.data[0].id);
          }
        },
        error: () => this.classes.set([]),
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
