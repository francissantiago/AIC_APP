import { AssetStatus, AssetType, FinancialType, PaymentMethod } from '@enums/finance';

export interface IPaginationQuery {
  page?: number;
  limit?: number;
}

export interface IPeriodQuery {
  from?: string;
  to?: string;
}

export interface IFinancialCategory {
  id: string;
  name: string;
  type: FinancialType;
  active: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateFinancialCategory {
  name: string;
  type: FinancialType;
}

export interface IUpdateFinancialCategory {
  name?: string;
  type?: FinancialType;
  active?: boolean;
}

export interface ICategoryQuery {
  type?: FinancialType;
  active?: boolean;
}

export interface IFinanceMemberSummary {
  id: string;
  fullName: string;
}

export interface IFinanceMemberOption {
  id: string;
  fullName: string;
}

export interface IFinancialEntry {
  id: string;
  categoryId: string;
  createdByUserId: string;
  memberId: string | null;
  member: IFinanceMemberSummary | null;
  type: FinancialType;
  amount: string;
  entryDate: string;
  description: string;
  paymentMethod: PaymentMethod;
  reference: string | null;
  notes: string | null;
  category: IFinancialCategory;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateFinancialEntry {
  entryDate: string;
  type: FinancialType;
  categoryId: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  memberId?: string | null;
}

export type IUpdateFinancialEntry = Partial<ICreateFinancialEntry>;

export interface IFinancialEntriesQuery extends IPaginationQuery, IPeriodQuery {
  type?: FinancialType;
  categoryId?: string;
  q?: string;
  memberId?: string;
}

export interface IPaginatedFinancialEntries {
  data: IFinancialEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface IAsset {
  id: string;
  createdByUserId: string;
  assetTag: string | null;
  name: string;
  type: AssetType;
  acquisitionDate: string | null;
  acquisitionValue: string | null;
  currentValue: string | null;
  location: string | null;
  status: AssetStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateAsset {
  assetTag?: string | null;
  name: string;
  type: AssetType;
  acquisitionDate?: string | null;
  acquisitionValue?: number | null;
  currentValue?: number | null;
  location?: string | null;
  status: AssetStatus;
  notes?: string | null;
}

export type IUpdateAsset = Partial<ICreateAsset>;

export interface IAssetsQuery extends IPaginationQuery {
  type?: AssetType;
  status?: AssetStatus;
  q?: string;
}

export interface IPaginatedAssets {
  data: IAsset[];
  total: number;
  page: number;
  limit: number;
}

export interface IFinancialDashboard {
  period: { from: string; to: string };
  totals: {
    income: string;
    expense: string;
    balance: string;
    activeAssets: number;
    estimatedAssetValue: string;
  };
  monthly: Array<{ month: string; income: string; expense: string }>;
  expensesByCategory: Array<{
    categoryId: string | null;
    categoryName: string;
    amount: string;
  }>;
}

export interface ICashFlowQuery extends IFinancialEntriesQuery {}
export interface ICashFlowCsvQuery extends IPeriodQuery {
  type?: FinancialType;
  categoryId?: string;
}

export interface ICashFlowReport extends IPaginatedFinancialEntries {
  summary: { income: string; expense: string; balance: string };
}

export interface IAssetReport extends IPaginatedAssets {
  quantity: number;
  estimatedValue: string;
}

export interface IMemberContributionsQuery extends IPaginationQuery {
  memberId: string;
  from: string;
  to: string;
}

export interface IMemberContributionsCsvQuery {
  memberId: string;
  from: string;
  to: string;
}

export interface IMemberContributionItem {
  id: string;
  entryDate: string;
  categoryName: string;
  description: string;
  amount: string;
  paymentMethod: PaymentMethod;
}

export interface IMemberContributionsSummary {
  total: string;
  tithesTotal: string;
  offeringsTotal: string;
  donationsTotal: string;
  entriesCount: number;
}

export interface IMemberContributionsReport {
  member: IFinanceMemberSummary;
  period: { from: string; to: string };
  summary: IMemberContributionsSummary;
  data: IMemberContributionItem[];
  total: number;
  page: number;
  limit: number;
}

export interface IFinanceMemberOptionsQuery {
  q?: string;
  limit?: number;
}
