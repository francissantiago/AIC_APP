import { PaymentMethod } from '@enums/finance';
import { ISocialProjectExpense } from '@interfaces/ISocialProjectExpense';

export interface ICreateSocialProjectExpense {
  amount: number;
  entryDate: string;
  description: string;
  paymentMethod?: PaymentMethod;
  categoryId?: string;
  notes?: string;
}

export interface ISocialProjectExpenseQuery {
  page?: number;
  limit?: number;
}

export interface IPaginatedSocialProjectExpenses {
  data: ISocialProjectExpense[];
  total: number;
  page: number;
  limit: number;
}
