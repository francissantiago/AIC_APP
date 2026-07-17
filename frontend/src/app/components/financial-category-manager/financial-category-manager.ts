import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FINANCIAL_TYPES, FinancialType } from '@enums/finance';
import { IFinancialCategory } from '@interfaces/IFinance';
import { TranslatePipe } from '@ngx-translate/core';
import { FinanceService } from '@services/finance-service';

@Component({
  selector: 'app-financial-category-manager',
  imports: [ReactiveFormsModule, TranslatePipe],
  template: `
    <section class="mb-5 w-full max-w-7xl" aria-labelledby="categories-title">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="categories-title" class="text-xl font-semibold text-slate-900">
          {{ 'FINANCE.CATEGORIES' | translate }}
        </h2>
        <button
          type="button"
          class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          (click)="closed.emit()"
        >
          {{ 'COMMON.CANCEL' | translate }}
        </button>
      </div>
      <form
        [formGroup]="form"
        (ngSubmit)="save()"
        class="mb-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_auto_auto]"
        novalidate
      >
        <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'FINANCE.CATEGORY_NAME' | translate }}</span>
          <input
            class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="name"
            maxlength="100"
            [attr.aria-invalid]="form.controls.name.touched && form.controls.name.invalid"
            [attr.aria-describedby]="
              form.controls.name.touched && form.controls.name.invalid
                ? 'category-name-error'
                : null
            "
          />
          @if (form.controls.name.touched && form.controls.name.invalid) {
            <span id="category-name-error" class="text-xs text-red-700">
              {{ 'COMMON.REQUIRED_FIELD' | translate }}
            </span>
          }
        </label>
        <label class="flex min-w-0 flex-col gap-1 text-sm text-slate-700">
          <span>{{ 'FINANCE.TYPE' | translate }}</span>
          <select
            class="w-full min-w-0 rounded-md border px-3 py-2 text-slate-900 focus:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:bg-slate-100"
            formControlName="type"
          >
            @for (type of types; track type) {
              <option [value]="type">{{ typeLabel(type) | translate }}</option>
            }
          </select>
        </label>
        <button
          class="self-end rounded-md bg-slate-500 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:opacity-50"
          type="submit"
        >
          {{ (editingId() ? 'COMMON.SAVE' : 'COMMON.CREATE') | translate }}
        </button>
        @if (editingId()) {
          <button
            class="self-end rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            type="button"
            (click)="cancelEdit()"
          >
            {{ 'COMMON.CANCEL' | translate }}
          </button>
        }
      </form>
      <ul class="divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200">
        @for (category of categories(); track category.id) {
          <li class="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span class="text-sm text-slate-900">
              {{ category.name }} · {{ typeLabel(category.type) | translate }}
            </span>
            <span class="flex flex-wrap gap-3">
              <button
                type="button"
                class="text-sm text-slate-900 underline underline-offset-2 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                (click)="edit(category)"
              >
                {{ 'COMMON.EDIT' | translate }}
              </button>
              <button
                type="button"
                class="text-sm text-red-700 underline underline-offset-2 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                (click)="toggle(category)"
              >
                {{ (category.active ? 'FINANCE.DEACTIVATE' : 'FINANCE.ACTIVATE') | translate }}
              </button>
            </span>
          </li>
        }
      </ul>
      @if (error()) {
        <p role="alert" class="mt-3 text-sm text-red-700">
          {{ 'FINANCE.CATEGORY_SAVE_ERROR' | translate }}
        </p>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialCategoryManager {
  readonly #finance = inject(FinanceService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly categories = input.required<readonly IFinancialCategory[]>();
  readonly changed = output<void>();
  readonly closed = output<void>();
  readonly error = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly types = FINANCIAL_TYPES;
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    type: new FormControl(FinancialType.INCOME, { nonNullable: true }),
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      queueMicrotask(() =>
        this.#host.nativeElement.querySelector<HTMLElement>('input.ng-invalid')?.focus(),
      );
      return;
    }
    this.error.set(false);
    const id = this.editingId();
    const request = id
      ? this.#finance.updateCategory(id, this.form.getRawValue())
      : this.#finance.createCategory(this.form.getRawValue());
    request.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: () => {
        this.cancelEdit();
        this.changed.emit();
      },
      error: () => this.error.set(true),
    });
  }

  edit(category: IFinancialCategory): void {
    this.editingId.set(category.id);
    this.form.setValue({ name: category.name, type: category.type });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', type: FinancialType.INCOME });
  }

  toggle(category: IFinancialCategory): void {
    this.error.set(false);
    this.#finance
      .updateCategory(category.id, { active: !category.active })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => this.changed.emit(),
        error: () => this.error.set(true),
      });
  }

  typeLabel(type: FinancialType): string {
    return type === FinancialType.INCOME ? 'FINANCE.INCOME' : 'FINANCE.EXPENSE';
  }
}
