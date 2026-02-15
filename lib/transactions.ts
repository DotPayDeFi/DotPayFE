import { mpesaClient } from './mpesa-client';
import { MpesaFlowType, MpesaTransaction as MpesaTx } from '../types/mpesa';
import {
  AdminTransactionResponse,
  FiatCryptoTransactionResponse,
  OnchainTransactionResponse,
  Transaction,
  TransactionHistoryFilters,
  TransactionHistoryResponse,
} from '../types/transaction-types';

type AnalyticsPayload = {
  totalVolume: number;
  totalCryptoVolume: number;
  averageTransactionSize: number;
  transactionCount: number;
  statusDistribution: Record<string, number>;
  chainDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  tokenDistribution: Record<string, number>;
  dailyVolume: Array<{ date: string; volume: number; count: number }>;
  conversionMetrics: {
    totalBuyVolume: number;
    totalSellVolume: number;
    averageConversionRate: number;
  };
};

function asDate(input?: string | null): Date {
  const date = input ? new Date(input) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapFlowToType(flowType: MpesaFlowType): Transaction['type'] {
  if (flowType === 'onramp') return 'fiat_to_crypto';
  if (flowType === 'offramp') return 'crypto_to_fiat';
  if (flowType === 'paybill') return 'crypto_to_paybill';
  return 'crypto_to_till';
}

function mapFlowToCategory(flowType: MpesaFlowType): Transaction['transactionCategory'] {
  if (flowType === 'onramp') return 'onramp';
  if (flowType === 'offramp' || flowType === 'paybill' || flowType === 'buygoods') return 'offramp';
  return 'onchain';
}

function mapFlowToSubType(flowType: MpesaFlowType): Transaction['transactionSubType'] {
  if (flowType === 'onramp') return 'received';
  return 'sent';
}

function mapStatus(status: MpesaTx['status']): Transaction['status'] {
  if (status === 'succeeded') return 'completed';
  if (status === 'failed' || status === 'refunded') return 'failed';
  if (status === 'created' || status === 'quoted') return 'pending';
  if (status === 'awaiting_user_authorization' || status === 'awaiting_onchain_funding') return 'pending';
  return 'processing';
}

function transactionSummary(tx: MpesaTx): string {
  if (tx.flowType === 'onramp') return `Top up ${tx.quote.expectedReceiveKes} KES`;
  if (tx.flowType === 'offramp') return `Cash out ${tx.quote.expectedReceiveKes} KES`;
  if (tx.flowType === 'paybill') return `PayBill ${tx.targets.paybillNumber || ''}`.trim();
  return `BuyGoods ${tx.targets.tillNumber || ''}`.trim();
}

function chainFromTx(tx: MpesaTx): string {
  const chainId = tx.onchain?.chainId;
  if (!chainId) return 'mpesa';
  if (chainId === 421614 || chainId === 42161) return 'arbitrum';
  if (chainId === 11155111 || chainId === 1) return 'ethereum';
  if (chainId === 8453 || chainId === 84532) return 'base';
  return `chain-${chainId}`;
}

function networkFromChain(chain: string): string {
  if (chain === 'mpesa') return 'M-Pesa';
  if (chain === 'arbitrum') return 'Arbitrum';
  if (chain === 'ethereum') return 'Ethereum';
  if (chain === 'base') return 'Base';
  return chain;
}

function explorerUrl(chain: string, hash: string): string {
  if (!hash) return '#';
  if (chain === 'arbitrum') return `https://arbiscan.io/tx/${hash}`;
  if (chain === 'ethereum') return `https://etherscan.io/tx/${hash}`;
  if (chain === 'base') return `https://basescan.org/tx/${hash}`;
  return '#';
}

function mapMpesaToTransaction(tx: MpesaTx): Transaction {
  const createdAt = asDate(tx.createdAt);
  const updatedAt = asDate(tx.updatedAt);
  const ageMinutes = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 60000));
  const isComplete = ['succeeded', 'failed', 'refunded'].includes(tx.status);
  const completedAt = isComplete ? updatedAt : undefined;
  const processingTimeSeconds = Math.max(
    0,
    Math.floor((isComplete ? updatedAt.getTime() : Date.now()) - createdAt.getTime()) / 1000
  );

  const usdAmount = toNumber(tx.quote?.amountUsd, toNumber(tx.quote?.amountKes) / Math.max(1, toNumber(tx.quote?.rateKesPerUsd, 150)));
  const kesAmount = toNumber(tx.quote?.amountKes);
  const chain = chainFromTx(tx);
  const txHash =
    (tx.onchain?.txHash || '').trim() ||
    (tx.daraja?.receiptNumber || '').trim() ||
    tx.transactionId;

  return {
    id: tx.transactionId,
    type: mapFlowToType(tx.flowType),
    status: mapStatus(tx.status),
    transactionCategory: mapFlowToCategory(tx.flowType),
    transactionSubType: mapFlowToSubType(tx.flowType),
    amount: usdAmount,
    token: {
      symbol: 'USDC',
      name: 'USD Coin',
      amount: usdAmount,
      decimals: 6,
    },
    values: {
      fiat: {
        amount: kesAmount,
        currency: 'KES',
        formatted: `KES ${Math.round(kesAmount).toLocaleString('en-KE')}`,
      },
      usd: {
        amount: usdAmount,
        formatted: `$${usdAmount.toFixed(2)}`,
      },
      kes: {
        amount: kesAmount,
        formatted: `KES ${Math.round(kesAmount).toLocaleString('en-KE')}`,
      },
    },
    blockchain: {
      chain,
      network: networkFromChain(chain),
      txHash,
      explorerUrl: explorerUrl(chain, txHash),
      explorerName: chain === 'mpesa' ? 'M-Pesa' : 'Block Explorer',
      isConfirmed: tx.status === 'succeeded',
      confirmations: tx.status === 'succeeded' ? 1 : 0,
      confirmationStatus: tx.status,
      networkFee: toNumber(tx.quote?.networkFeeKes),
    },
    mpesa: {
      transactionId: tx.transactionId,
      receiptNumber: tx.daraja?.receiptNumber || '',
    },
    conversion:
      tx.flowType === 'onramp' || tx.flowType === 'offramp'
        ? {
            direction: tx.flowType === 'onramp' ? 'KES -> USDC' : 'USDC -> KES',
            type: tx.flowType,
            fiatAmount: kesAmount,
            cryptoAmount: usdAmount,
            conversionRate: toNumber(tx.quote?.rateKesPerUsd, 150),
            effectiveRate: toNumber(tx.quote?.rateKesPerUsd, 150),
            rateDisplay: `1 USDC = KES ${toNumber(tx.quote?.rateKesPerUsd, 150).toFixed(2)}`,
          }
        : undefined,
    timing: {
      createdAt: createdAt.toISOString(),
      completedAt: completedAt?.toISOString(),
      processingTimeSeconds,
      ageMinutes,
      formatted: {
        created: createdAt.toLocaleString('en-US'),
        completed: completedAt?.toLocaleString('en-US'),
      },
    },
    dashboard: {
      priority: tx.status === 'failed' ? 'high' : tx.status === 'succeeded' ? 'normal' : 'low',
      category: tx.flowType,
      statusColor: tx.status === 'succeeded' ? 'green' : tx.status === 'failed' ? 'red' : 'blue',
      icon: tx.flowType,
      summary: transactionSummary(tx),
    },
    statusValidation: {
      wasCorrected: false,
      originalStatus: tx.status,
      correctionReason: null,
      validatedAt: new Date().toISOString(),
    },
  };
}

function typeToFlow(type?: TransactionHistoryFilters['type']): MpesaFlowType | undefined {
  if (type === 'fiat_to_crypto') return 'onramp';
  if (type === 'crypto_to_fiat') return 'offramp';
  if (type === 'crypto_to_paybill') return 'paybill';
  if (type === 'crypto_to_till') return 'buygoods';
  return undefined;
}

function applyFilters(transactions: Transaction[], filters: TransactionHistoryFilters): Transaction[] {
  return transactions.filter((tx) => {
    if (filters.status && tx.status !== filters.status) return false;
    if (filters.type && tx.type !== filters.type) return false;
    if (filters.chain && tx.blockchain.chain !== filters.chain) return false;
    if (filters.tokenType && tx.token.symbol !== filters.tokenType) return false;

    if (filters.dateFrom) {
      const from = asDate(filters.dateFrom);
      if (new Date(tx.timing.createdAt) < from) return false;
    }

    if (filters.dateTo) {
      const to = asDate(filters.dateTo);
      if (new Date(tx.timing.createdAt) > to) return false;
    }

    const kesAmount = tx.values.kes.amount;
    if (typeof filters.minAmount === 'number' && kesAmount < filters.minAmount) return false;
    if (typeof filters.maxAmount === 'number' && kesAmount > filters.maxAmount) return false;
    if (filters.hasTransactionHash && !tx.blockchain.txHash) return false;
    if (filters.hasMpesaId && !tx.mpesa?.transactionId) return false;

    return true;
  });
}

async function fetchMappedTransactions(filters: TransactionHistoryFilters = {}): Promise<Transaction[]> {
  const backendLimit = Math.max(20, Math.min(filters.limit || 50, 100));

  const response = await mpesaClient.listTransactions({
    flowType: typeToFlow(filters.type),
    limit: backendLimit,
  });

  return response.data.transactions.map(mapMpesaToTransaction);
}

function buildSummary(totalCount: number, page: number, limit: number) {
  const pages = totalCount === 0 ? 1 : Math.ceil(totalCount / limit);
  return {
    total: totalCount,
    page,
    limit,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
}

function buildAnalytics(transactions: Transaction[]): AnalyticsPayload {
  const statusDistribution: Record<string, number> = {};
  const chainDistribution: Record<string, number> = {};
  const typeDistribution: Record<string, number> = {};
  const tokenDistribution: Record<string, number> = {};
  const dailyBuckets: Record<string, { volume: number; count: number }> = {};

  let totalVolume = 0;
  let totalCryptoVolume = 0;
  let buyVolume = 0;
  let sellVolume = 0;
  let rateAccumulator = 0;
  let rateCount = 0;

  for (const tx of transactions) {
    totalVolume += tx.values.usd.amount;
    totalCryptoVolume += tx.token.amount;

    statusDistribution[tx.status] = (statusDistribution[tx.status] || 0) + 1;
    chainDistribution[tx.blockchain.chain] = (chainDistribution[tx.blockchain.chain] || 0) + 1;
    typeDistribution[tx.type] = (typeDistribution[tx.type] || 0) + 1;
    tokenDistribution[tx.token.symbol] = (tokenDistribution[tx.token.symbol] || 0) + 1;

    const day = tx.timing.createdAt.slice(0, 10);
    dailyBuckets[day] = dailyBuckets[day] || { volume: 0, count: 0 };
    dailyBuckets[day].volume += tx.values.usd.amount;
    dailyBuckets[day].count += 1;

    if (tx.type === 'fiat_to_crypto') buyVolume += tx.values.usd.amount;
    if (tx.type === 'crypto_to_fiat') sellVolume += tx.values.usd.amount;

    if (tx.conversion?.conversionRate) {
      rateAccumulator += tx.conversion.conversionRate;
      rateCount += 1;
    }
  }

  const dailyVolume = Object.entries(dailyBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({ date, volume: bucket.volume, count: bucket.count }));

  return {
    totalVolume,
    totalCryptoVolume,
    averageTransactionSize: transactions.length ? totalVolume / transactions.length : 0,
    transactionCount: transactions.length,
    statusDistribution,
    chainDistribution,
    typeDistribution,
    tokenDistribution,
    dailyVolume,
    conversionMetrics: {
      totalBuyVolume: buyVolume,
      totalSellVolume: sellVolume,
      averageConversionRate: rateCount ? rateAccumulator / rateCount : 0,
    },
  };
}

function toCsv(transactions: Transaction[]): string {
  const headers = [
    'id',
    'type',
    'status',
    'amount_usd',
    'amount_kes',
    'chain',
    'created_at',
    'mpesa_transaction_id',
    'mpesa_receipt',
  ];

  const rows = transactions.map((tx) => [
    tx.id,
    tx.type,
    tx.status,
    tx.values.usd.amount.toFixed(2),
    tx.values.kes.amount.toFixed(2),
    tx.blockchain.chain,
    tx.timing.createdAt,
    tx.mpesa?.transactionId || '',
    tx.mpesa?.receiptNumber || '',
  ]);

  return [headers.join(','), ...rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\n');
}

async function fetchHistory(filters: TransactionHistoryFilters = {}): Promise<TransactionHistoryResponse> {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Math.min(Number(filters.limit) || 20, 100));

  const transactions = await fetchMappedTransactions(filters);
  const filtered = applyFilters(transactions, filters).sort(
    (a, b) => new Date(b.timing.createdAt).getTime() - new Date(a.timing.createdAt).getTime()
  );

  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  return {
    success: true,
    message: 'Transaction history loaded',
    data: {
      transactions: paged,
      summary: buildSummary(filtered.length, page, limit),
      filters: {
        applied: Object.entries(filters)
          .filter(([, value]) => value !== undefined && value !== null && value !== '')
          .map(([key, value]) => `${key}=${String(value)}`),
        available: {
          statuses: ['pending', 'processing', 'completed', 'failed', 'error', 'reserved'],
          types: ['fiat_to_crypto', 'crypto_to_fiat', 'crypto_to_paybill', 'crypto_to_till', 'token_transfer'],
          chains: ['mpesa', 'arbitrum', 'base', 'ethereum'],
          tokens: ['USDC'],
        },
      },
    },
  };
}

async function buildAdminResponse(filters: TransactionHistoryFilters = {}): Promise<AdminTransactionResponse> {
  const history = await fetchHistory(filters);
  const analytics = buildAnalytics(history.data.transactions);

  return {
    success: true,
    message: 'Transactions loaded',
    data: {
      transactions: history.data.transactions,
      summary: history.data.summary,
      analytics: {
        totalVolume: analytics.totalVolume,
        totalCryptoVolume: analytics.totalCryptoVolume,
        averageTransactionSize: analytics.averageTransactionSize,
        statusDistribution: analytics.statusDistribution,
        chainDistribution: analytics.chainDistribution,
      },
    },
  };
}

export const transactionAPI = {
  getHistory: (filters: TransactionHistoryFilters = {}): Promise<TransactionHistoryResponse> => {
    return fetchHistory(filters);
  },

  getTransaction: async (id: string): Promise<{ success: boolean; message: string; data: Transaction }> => {
    const response = await mpesaClient.getTransaction(id);
    return {
      success: true,
      message: 'Transaction loaded',
      data: mapMpesaToTransaction(response.data),
    };
  },

  getTransactionAnalytics: async (filters: TransactionHistoryFilters = {}) => {
    const history = await fetchHistory({ ...filters, page: 1, limit: 100 });
    const analytics = buildAnalytics(history.data.transactions);
    return {
      success: true,
      message: 'Transaction analytics loaded',
      data: analytics,
    };
  },

  exportTransactions: async (
    filters: TransactionHistoryFilters = {},
    format: 'csv' | 'json' = 'csv'
  ): Promise<Blob> => {
    const history = await fetchHistory({ ...filters, page: 1, limit: 100 });
    const payload = history.data.transactions;

    if (format === 'json') {
      return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    }

    return new Blob([toCsv(payload)], { type: 'text/csv;charset=utf-8;' });
  },

  getAllTransactions: (filters: TransactionHistoryFilters = {}): Promise<AdminTransactionResponse> => {
    return buildAdminResponse(filters);
  },

  getOnchainTransactions: async (
    filters: TransactionHistoryFilters = {}
  ): Promise<OnchainTransactionResponse> => {
    const history = await fetchHistory({ ...filters, page: 1, limit: 100 });
    const onchain = history.data.transactions.filter((tx) => tx.transactionCategory === 'onchain');

    const byChain: Record<string, number> = {};
    let totalVolume = 0;
    for (const tx of onchain) {
      byChain[tx.blockchain.chain] = (byChain[tx.blockchain.chain] || 0) + 1;
      totalVolume += tx.values.usd.amount;
    }

    return {
      success: true,
      message: 'Onchain transactions loaded',
      data: {
        transactions: onchain,
        summary: buildSummary(onchain.length, 1, Math.max(1, filters.limit || 100)),
        blockchain: {
          totalChains: Object.keys(byChain).length,
          chainDistribution: byChain,
          totalVolume,
          averageTransactionSize: onchain.length ? totalVolume / onchain.length : 0,
        },
      },
    };
  },

  getFiatCryptoTransactions: async (
    filters: TransactionHistoryFilters = {}
  ): Promise<FiatCryptoTransactionResponse> => {
    const history = await fetchHistory({ ...filters, page: 1, limit: 100 });
    const subset = history.data.transactions.filter(
      (tx) => tx.type === 'fiat_to_crypto' || tx.type === 'crypto_to_fiat'
    );

    let totalBuyVolume = 0;
    let totalSellVolume = 0;
    let totalCryptoVolume = 0;
    let rateAccumulator = 0;
    let rateCount = 0;

    for (const tx of subset) {
      if (tx.type === 'fiat_to_crypto') totalBuyVolume += tx.values.usd.amount;
      if (tx.type === 'crypto_to_fiat') totalSellVolume += tx.values.usd.amount;
      totalCryptoVolume += tx.token.amount;
      if (tx.conversion?.conversionRate) {
        rateAccumulator += tx.conversion.conversionRate;
        rateCount += 1;
      }
    }

    return {
      success: true,
      message: 'Fiat/crypto transactions loaded',
      data: {
        transactions: subset,
        summary: buildSummary(subset.length, 1, Math.max(1, filters.limit || 100)),
        conversions: {
          totalBuyVolume,
          totalSellVolume,
          totalCryptoVolume,
          averageConversionRate: rateCount ? rateAccumulator / rateCount : 0,
          conversionDistribution: {
            buy: subset.filter((tx) => tx.type === 'fiat_to_crypto').length,
            sell: subset.filter((tx) => tx.type === 'crypto_to_fiat').length,
          },
        },
      },
    };
  },
};

export const transactionUtils = {
  getTypeIcon: (type: Transaction['type']) => {
    if (type === 'fiat_to_crypto') return '💰';
    if (type === 'crypto_to_fiat') return '💸';
    if (type === 'crypto_to_paybill') return '📱';
    if (type === 'crypto_to_till') return '🏪';
    return '↗️';
  },

  formatAmount: (tx: Transaction) => {
    return `${tx.token.amount.toFixed(2)} ${tx.token.symbol}`;
  },

  formatTimeAgo: (ageMinutes: number) => {
    const value = Math.max(0, Math.floor(toNumber(ageMinutes)));
    if (value < 1) return 'Just now';
    if (value < 60) return `${value}m ago`;
    if (value < 1440) return `${Math.floor(value / 60)}h ago`;
    return `${Math.floor(value / 1440)}d ago`;
  },

  getStatusColor: (status: Transaction['status']) => {
    if (status === 'completed') return 'text-green-400';
    if (status === 'processing') return 'text-blue-400';
    if (status === 'pending') return 'text-yellow-400';
    if (status === 'failed' || status === 'error') return 'text-red-400';
    return 'text-orange-400';
  },

  getChainColor: (chain: string) => {
    if (chain === 'arbitrum') return 'text-blue-400';
    if (chain === 'base') return 'text-blue-300';
    if (chain === 'ethereum') return 'text-purple-300';
    if (chain === 'mpesa') return 'text-green-300';
    return 'text-gray-300';
  },
};
