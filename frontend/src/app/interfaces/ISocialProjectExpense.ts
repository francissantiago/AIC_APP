import { FinancialType, PaymentMethod } from '@enums/finance';
import { ICreatedByUserSummary } from '@interfaces/ICreatedByUserSummary';
import { IFinanceMemberSummary } from '@interfaces/IFinance';

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
  member: IFinanceMemberSummary | null;
  createdBy: ICreatedByUserSummary | null;
  createdAt: string;
  updatedAt: string;
}
