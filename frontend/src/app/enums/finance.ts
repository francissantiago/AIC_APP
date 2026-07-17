export enum FinancialType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum PaymentMethod {
  CASH = 'cash',
  PIX = 'pix',
  BANK_TRANSFER = 'bank_transfer',
  CARD = 'card',
  OTHER = 'other',
}

export enum AssetType {
  PROPERTY = 'property',
  VEHICLE = 'vehicle',
  EQUIPMENT = 'equipment',
  FURNITURE = 'furniture',
  INSTRUMENT = 'instrument',
  OTHER = 'other',
}

export enum AssetStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  DISPOSED = 'disposed',
}

export const FINANCIAL_TYPES = Object.values(FinancialType);
export const PAYMENT_METHODS = Object.values(PaymentMethod);
export const ASSET_TYPES = Object.values(AssetType);
export const ASSET_STATUSES = Object.values(AssetStatus);
