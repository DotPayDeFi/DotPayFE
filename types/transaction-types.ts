// Transaction History Types
export interface TransactionHistoryFilters {
  page?: number;
  limit?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'error' | 'reserved';
  type?: 'fiat_to_crypto' | 'crypto_to_fiat' | 'crypto_to_paybill' | 'crypto_to_till' | 'token_transfer';
  chain?: string;
  tokenType?: 'USDC' | 'USDT' | 'BTC' | 'ETH' | 'WETH' | 'WBTC' | 'DAI' | 'CELO';
  dateFrom?: string; // ISO8601 format
  dateTo?: string; // ISO8601 format
  userId?: string; // Admin only
  minAmount?: number; // Admin only
  maxAmount?: number; // Admin only
  hasTransactionHash?: boolean; // Admin only
  hasMpesaId?: boolean; // Admin only
  conversionType?: 'buy' | 'sell'; // For fiat-crypto transactions
}

export interface TransactionToken {
  symbol: string;
  name: string;
  amount: number;
  decimals: number;
}

export interface TransactionValues {
  fiat: {
    amount: number;
    currency: string;
    formatted: string;
  };
  usd: {
    amount: number;
    formatted: string;
  };
  kes: {
    amount: number;
    formatted: string;
  };
}

export interface TransactionBlockchain {
  chain: string;
  network: string;
  txHash: string;
  explorerUrl: string;
  explorerName: string;
  isConfirmed?: boolean;
  confirmations?: number;
  confirmationStatus?: string;
  networkFee?: number;
  gasUsed?: number;
  gasPrice?: string;
}

export interface TransactionPortfolio {
  impact: 'positive' | 'negative' | 'neutral';
  direction: '+' | '-';
  description: string;
}

export interface TransactionTiming {
  createdAt: string;
  completedAt?: string;
  processingTimeSeconds: number;
  ageMinutes: number;
  formatted: {
    created: string;
    completed?: string;
  };
}

export interface TransactionReferences {
  transactionId: string;
  mpesaTransactionId: string | null;
  retryCount: number;
}

export interface TransactionDashboard {
  priority: 'low' | 'normal' | 'high';
  category: string;
  statusColor: string;
  icon: string;
  summary: string;
}

export interface Transaction {
  id: string;
  type: 'fiat_to_crypto' | 'crypto_to_fiat' | 'crypto_to_paybill' | 'crypto_to_till' | 'token_transfer';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'error' | 'reserved';
  transactionCategory?: 'onchain' | 'onramp' | 'offramp' | 'cardpayment';
  transactionSubType?: 'sent' | 'received' | 'swap';
  amount: number;
  token: TransactionToken;
  values: TransactionValues;
  blockchain: TransactionBlockchain;
  user?: {
    id: string;
    phone: string;
    email: string;
    wallet: string;
  };
  mpesa?: {
    transactionId: string;
    receiptNumber: string;
  };
  conversion?: {
    direction: string;
    type: string;
    fiatAmount: number;
    cryptoAmount: number;
    conversionRate: number;
    effectiveRate: number;
    rateDisplay: string;
  };
  timing: TransactionTiming;
  dashboard: TransactionDashboard;
  statusValidation?: {
    wasCorrected: boolean;
    originalStatus: string;
    correctionReason: string | null;
    validatedAt: string;
  };
}

export interface TransactionHistorySummary {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
  statusCorrections?: {
    corrected: number;
    totalProcessed: number;
  };
}

export interface TransactionHistoryFiltersInfo {
  applied: string[];
  available: {
    statuses: string[];
    types: string[];
    chains: string[];
    tokens: string[];
  };
}

export interface TransactionHistoryResponse {
  success: boolean;
  message: string;
  data: {
    transactions: Transaction[];
    summary: TransactionHistorySummary;
    filters?: TransactionHistoryFiltersInfo;
  };
}

// Enhanced response interfaces for admin endpoints
export interface AdminTransactionResponse {
  success: boolean;
  message: string;
  data: {
    transactions: Transaction[];
    summary: TransactionHistorySummary;
    analytics?: {
      totalVolume: number;
      totalCryptoVolume: number;
      averageTransactionSize: number;
      statusDistribution: Record<string, number>;
      chainDistribution: Record<string, number>;
    };
  };
}

export interface OnchainTransactionResponse {
  success: boolean;
  message: string;
  data: {
    transactions: Transaction[];
    summary: TransactionHistorySummary;
    blockchain: {
      totalChains: number;
      chainDistribution: Record<string, number>;
      totalVolume: number;
      averageTransactionSize: number;
    };
  };
}

export interface FiatCryptoTransactionResponse {
  success: boolean;
  message: string;
  data: {
    transactions: Transaction[];
    summary: TransactionHistorySummary;
    conversions: {
      totalBuyVolume: number;
      totalSellVolume: number;
      totalCryptoVolume: number;
      averageConversionRate: number;
      conversionDistribution: Record<string, number>;
    };
  };
}

// Status Correction Interfaces
export interface StatusCorrectionSummary {
  totalProcessed: number;
  successfullyCorrected: number;
  errorsEncountered: number;
  markedAsFailed: number;
  completedWithoutHashes: number;
}

export interface CorrectedTransaction {
  transactionId: string;
  originalStatus: string;
  newStatus: string;
  blockchainHash?: string;
  type: string;
  amount: number;
}

export interface FailedTransaction {
  transactionId: string;
  originalStatus: string;
  newStatus: string;
  reason: string;
  type: string;
  amount: number;
}

export interface StatusCorrectionDetails {
  correctedTransactions: CorrectedTransaction[];
  failedTransactions: FailedTransaction[];
}

export interface StatusCorrectionResponse {
  success: boolean;
  message: string;
  data: {
    summary: StatusCorrectionSummary;
    details: StatusCorrectionDetails;
  };
}

// UI Helper Types
export interface TransactionStatusConfig {
  color: string;
  bgColor: string;
  icon: string;
  label: string;
}

export interface TransactionTypeConfig {
  icon: string;
  label: string;
  color: string;
}

export interface ChainConfig {
  name: string;
  color: string;
  icon: string;
}

