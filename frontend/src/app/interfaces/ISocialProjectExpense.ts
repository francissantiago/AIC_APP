import { FinancialType, PaymentMethod } from '@enums/finance';

/** Espelha SocialProjectExpenseResponseDto do backend. */
export interface ISocialProjectExpense {
  id: string;
  congregationId: string;
  socialProjectId: string;
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
