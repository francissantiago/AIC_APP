import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppDialog } from '@components/app-dialog/app-dialog';
import { ConstructionExpenseForm } from '@components/constructions/construction-expense-form/construction-expense-form';
import { TranslatePipe } from '@ngx-translate/core';
import { PaymentMethod } from '@enums/finance';
import { IConstructionExpense } from '@interfaces/IConstructionExpense';
import { AuthService } from '@services/auth-service';
import { ConstructionExpensesService } from '@services/construction-expenses-service';
import { AppDatePipe } from '@pipes/app-date-pipe';

@Component({
  selector: 'app-construction-expenses-list',
  imports: [AppDatePipe, AppDialog, ConstructionExpenseForm, TranslatePipe],
  templateUrl: './construction-expenses-list.html',
  styleUrl: './construction-expenses-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConstructionExpensesList implements OnInit {
  readonly #expensesService = inject(ConstructionExpensesService);
  readonly #auth = inject(AuthService);
  readonly #destroyRef = inject(DestroyRef);

  readonly projectId = input.required<string>();

  readonly expenses = signal<IConstructionExpense[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly deleting = signal(false);
  readonly pendingDeleteId = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly showForm = signal(false);

  readonly totalPages = computed(() => {
    const pages = Math.ceil(this.total() / this.limit());
    return pages > 0 ? pages : 1;
  });

  readonly canWrite = computed(() => this.#auth.hasPermission('constructions:write'));

  ngOnInit(): void {
    this.#loadExpenses();
  }

  paymentLabelKey(method: PaymentMethod): string {
    return `CONSTRUCTIONS.PAYMENT_${method.toUpperCase()}`;
  }

  formatCurrency(value: string): string {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      return value;
    }
    return amount.toLocaleString(undefined, { style: 'currency', currency: 'BRL' });
  }

  openCreate(): void {
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  afterSave(): void {
    this.closeForm();
    this.feedback.set('CONSTRUCTIONS.SAVE_SUCCESS');
    this.#loadExpenses();
  }

  previousPage(): void {
    if (this.page() <= 1) return;
    this.page.update((value) => value - 1);
    this.#loadExpenses();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((value) => value + 1);
    this.#loadExpenses();
  }

  askDelete(entryId: string): void {
    this.pendingDeleteId.set(entryId);
    this.feedback.set(null);
  }

  cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  confirmDelete(): void {
    const entryId = this.pendingDeleteId();
    if (!entryId) return;

    this.deleting.set(true);
    this.#expensesService
      .remove(this.projectId(), entryId)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.pendingDeleteId.set(null);
          this.feedback.set('CONSTRUCTIONS.DELETE_SUCCESS');
          this.#loadExpenses();
        },
        error: () => {
          this.deleting.set(false);
          this.feedback.set('CONSTRUCTIONS.DELETE_ERROR');
        },
      });
  }

  #loadExpenses(): void {
    this.loading.set(true);
    this.error.set(false);

    this.#expensesService
      .list(this.projectId(), { page: this.page(), limit: this.limit() })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (response) => {
          this.expenses.set(response.data);
          this.total.set(response.total);
          this.page.set(response.page);
          this.limit.set(response.limit);
          this.loading.set(false);
        },
        error: () => {
          this.expenses.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }
}
