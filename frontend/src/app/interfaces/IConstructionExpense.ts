import { FinancialType, PaymentMethod } from '@enums/finance';

/** Espelha ConstructionExpenseResponseDto do backend. */
export interface IConstructionExpense {
  id: string;
  congregationId: string;
  constructionProjectId: string;
  categoryId: string;
  categoryName: string | null;
  type: FinancialType;
  amount: string;
  entryDate: string;
  description: string;
  paymentMethod: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
