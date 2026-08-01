import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppDialog } from '@components/app-dialog/app-dialog';
import { ActionButton } from '@components/action-button/action-button';
import { ActionButtonGroup } from '@components/action-button-group/action-button-group';
import { SocialProjectExpenseForm } from '@components/social-projects/social-project-expense-form/social-project-expense-form';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ActionButtonVariant } from '@enums/action-button-variant';
import { PaymentMethod } from '@enums/finance';
import { ISocialProjectExpense } from '@interfaces/ISocialProjectExpense';
import { AuthService } from '@services/auth-service';
import { SocialProjectExpensesService } from '@services/social-project-expenses-service';
import { AppDatePipe } from '@pipes/app-date-pipe';

@Component({
  selector: 'app-social-project-expenses-list',
  imports: [
    AppDatePipe,
    ActionButton,
    ActionButtonGroup,
    AppDialog,
    SocialProjectExpenseForm,
    TranslatePipe,
  ],
  templateUrl: './social-project-expenses-list.html',
  styleUrl: './social-project-expenses-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialProjectExpensesList implements OnInit {
  readonly actionVariants = ActionButtonVariant;

  readonly #expensesService = inject(SocialProjectExpensesService);
  readonly #auth = inject(AuthService);
  readonly #translate = inject(TranslateService);
  readonly #destroyRef = inject(DestroyRef);

  readonly projectId = input.required<string>();
  readonly expenseChanged = output<void>();

  readonly expenses = signal<ISocialProjectExpense[]>([]);
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

  readonly canWrite = computed(() => this.#auth.hasPermission('social-projects:write'));

  ngOnInit(): void {
    this.#loadExpenses();
  }

  paymentLabelKey(method: PaymentMethod): string {
    return `SOCIAL_PROJECTS.PAYMENT_${method.toUpperCase()}`;
  }

  formatCurrency(value: string): string {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      return value;
    }
    return amount.toLocaleString(undefined, { style: 'currency', currency: 'BRL' });
  }

  registeredByLabel(expense: ISocialProjectExpense): string {
    if (expense.member?.fullName) {
      return expense.member.fullName;
    }
    if (expense.createdBy?.fullName) {
      return expense.createdBy.fullName;
    }
    return this.#translate.instant('COMMON.NOT_AVAILABLE');
  }

  openCreate(): void {
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
  }

  afterSave(): void {
    this.closeForm();
    this.feedback.set('SOCIAL_PROJECTS.EXPENSE_SAVE_SUCCESS');
    this.#loadExpenses();
    this.expenseChanged.emit();
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
          this.feedback.set('SOCIAL_PROJECTS.EXPENSE_DELETE_SUCCESS');
          this.#loadExpenses();
          this.expenseChanged.emit();
        },
        error: () => {
          this.deleting.set(false);
          this.feedback.set('SOCIAL_PROJECTS.EXPENSE_DELETE_ERROR');
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
