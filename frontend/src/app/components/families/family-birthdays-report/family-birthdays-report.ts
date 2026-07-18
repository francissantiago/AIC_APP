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
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { FamilyRelation } from '@enums/family-relation';
import { IBirthdayReportItem } from '@interfaces/IBirthdayReportItem';
import { IFamily } from '@interfaces/IFamily';
import { ApiErrorService } from '@services/api-error.service';
import { FamiliesService } from '@services/families-service';

const MONTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

function currentMonth(): number {
  return new Date().getMonth() + 1;
}

@Component({
  selector: 'app-family-birthdays-report',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './family-birthdays-report.html',
  styleUrl: './family-birthdays-report.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyBirthdaysReport implements OnInit {
  readonly #familiesService = inject(FamiliesService);
  readonly #apiError = inject(ApiErrorService);
  readonly #destroyRef = inject(DestroyRef);

  readonly months = MONTH_OPTIONS;
  readonly families = signal<IFamily[]>([]);
  readonly items = signal<IBirthdayReportItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly loaded = signal(false);

  readonly filterForm = new FormGroup({
    month: new FormControl(currentMonth(), {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(12)],
    }),
    familyId: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.#loadFamilies();
    this.loadReport();
  }

  relationLabelKey(relation: FamilyRelation): string {
    return `FAMILIES.RELATION_${relation.toUpperCase()}`;
  }

  ageFromBirthDate(birthDate: string): number | null {
    const parsed = new Date(`${birthDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - parsed.getFullYear();
    const monthDiff = today.getMonth() - parsed.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
      age -= 1;
    }
    return age >= 0 ? age : null;
  }

  loadReport(): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }

    const { month, familyId } = this.filterForm.getRawValue();
    const monthNumber = Number(month);
    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      this.filterForm.controls.month.markAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(false);
    this.errorMessage.set(null);

    this.#familiesService
      .birthdays({
        month: monthNumber,
        familyId: familyId.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.items.set(response.data);
          this.loading.set(false);
          this.loaded.set(true);
        },
        error: (error: HttpErrorResponse) => {
          this.items.set([]);
          this.loading.set(false);
          this.loaded.set(true);
          this.error.set(true);
          const resolved = this.#apiError.resolve(error);
          this.errorMessage.set(resolved.displayMessage);
        },
      });
  }

  #loadFamilies(): void {
    this.#familiesService
      .list({ page: 1, limit: 100 })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => this.families.set(response.data),
        error: () => this.families.set([]),
      });
  }
}
