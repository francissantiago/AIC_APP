import { PaymentMethod } from '@enums/finance';
import { IConstructionExpense } from '@interfaces/IConstructionExpense';
import { IConstructionPhoto } from '@interfaces/IConstructionPhoto';

export interface ICreateConstructionExpense {
  amount: number;
  entryDate: string;
  description: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  categoryId?: string;
}

export interface IQueryConstructionExpenses {
  page?: number;
  limit?: number;
}

export interface IPaginatedConstructionExpenses {
  data: IConstructionExpense[];
  total: number;
  page: number;
  limit: number;
}

export interface IPaginatedConstructionPhotos {
  data: IConstructionPhoto[];
  total: number;
  page: number;
  limit: number;
}

export interface IUploadConstructionPhoto {
  file: File;
  caption?: string;
  constructionUpdateId?: string;
}
