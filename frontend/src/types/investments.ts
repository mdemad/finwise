export type AssetType = 'stock' | 'mutual_fund' | 'etf' | 'bond' | 'crypto' | 'reit' | 'other';
export type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND' | 'FEE' | 'SPLIT' | 'TRANSFER_IN' | 'TRANSFER_OUT';
export type HoldingStatus = 'active' | 'closed' | 'archived';

export interface Holding {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  currency: string;
  brokerCode: string;
  externalHoldingId?: string;
  unitsHeld: number;
  averageBuyPrice: number;
  currentPrice: number;
  status: HoldingStatus;
  costBasis: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HoldingCreatePayload {
  symbol: string;
  name: string;
  assetType: AssetType;
  currency?: string;
  brokerCode?: string;
  externalHoldingId?: string;
  currentPrice?: number;
  initialQuantity?: number;
  initialPrice?: number;
  notes?: string;
}

export interface HoldingUpdatePayload {
  symbol?: string;
  name?: string;
  assetType?: AssetType;
  currency?: string;
  brokerCode?: string;
  currentPrice?: number;
  status?: HoldingStatus;
  notes?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  holdingId: string;
  transactionType: TransactionType;
  quantity: number;
  price: number;
  amount: number;
  fees: number;
  currency: string;
  transactionDate: string;
  externalTransactionId?: string;
  notes?: string;
  createdAt: string;
  realizedPnL?: number;
}

export interface TransactionCreatePayload {
  holdingId: string;
  transactionType: TransactionType;
  quantity: number;
  price: number;
  amount?: number;
  fees?: number;
  currency?: string;
  transactionDate: string;
  externalTransactionId?: string;
  notes?: string;
}

export interface AssetAllocationItem {
  assetType: AssetType;
  valueBase: number;
  percentage: number;
}

export interface InvestmentSummary {
  totalValueBase: number;
  totalCostBasisBase: number;
  totalUnrealizedPnLBase: number;
  unrealizedPnLPercent: number;
  holdingCount: number;
  userCurrency: string;
  allocationByAssetType: AssetAllocationItem[];
}
