import { mpesaClient } from './mpesa-client';
import { MpesaTransaction } from '../types/mpesa';

export type TokenBalance = {
  balance: number;
  usdValue: number;
  kesValue: number;
  price: number;
  contractAddress?: string;
};

export type ChainBalances = {
  USDC: TokenBalance;
  USDT: TokenBalance;
  [key: string]: TokenBalance | undefined;
};

export type BusinessBalanceOverview = {
  totalUSDValue: number;
  totalKESValue: number;
  activeChains: string[];
  totalTokens: Record<string, number>;
  lastUpdated: string;
};

export type BusinessBalance = {
  businessId: string;
  balances: Record<string, ChainBalances>;
  overview: BusinessBalanceOverview;
  summary: {
    supportedChains: string[];
    supportedTokens: string[];
    nonZeroChains: number;
    nonZeroTokens: number;
  };
};

export type ChainSpecificBalance = {
  businessId: string;
  chain: string;
  balances: ChainBalances;
  updatedAt: string;
};

export type BusinessTransaction = {
  transactionId: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'error';
  amount: number;
  tokenType: string;
  chain: string;
  createdAt: string;
  completedAt?: string;
  transactionCategory?: 'onchain' | 'onramp' | 'offramp' | 'cardpayment';
  transactionSubType?: 'sent' | 'received' | 'swap';
  mpesaReceipt?: string | null;
};

export type BusinessTransactionHistory = {
  transactions: BusinessTransaction[];
  summary: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type WithdrawToPersonalRequest = {
  businessId: string;
  amount: number;
  tokenType: string;
  chain: string;
};

export type WithdrawToPersonalResponse = {
  transactionId: string;
  status: 'pending' | 'processing' | 'completed';
  amount: number;
  tokenType: string;
  chain: string;
};

export type WithdrawToMpesaRequest = {
  businessId: string;
  amount: number;
  phoneNumber: string;
  tokenType: string;
  chain: string;
  pin?: string;
  signature?: string;
};

export type WithdrawToMpesaResponse = {
  transactionId: string;
  status: string;
  flowType: string;
  amountKes: number;
  amountUsd: number;
  phoneNumber: string;
  quoteId: string;
  receiptNumber: string | null;
  initiatedAt: string;
  transaction: MpesaTransaction;
};

export type BusinessCreditScore = {
  creditScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  creditLimit: number;
  availableCredit: number;
  totalVolume: number;
  monthlyVolume: number;
  currentCredit: number;
  paymentHistory: {
    totalPayments: number;
    completedPayments: number;
    successRate: number;
  };
  recommendations: string[];
  lastAssessment: string;
};

export type LoanApplicationRequest = {
  businessId: string;
  loanAmount: number;
  purpose: string;
  repaymentPeriod: number;
};

export type LoanApplicationResponse = {
  loanApplication: {
    loanId: string;
    businessName: string;
    loanAmount: number;
    purpose: string;
    repaymentPeriod: number;
    interestRate: number;
    monthlyPayment: number;
    status: 'pending_approval' | 'approved' | 'rejected';
  };
  nextSteps: string[];
  estimatedApprovalTime: string;
};

type ApiOk<T> = {
  success: true;
  data: T;
  message?: string;
};

type ApiFail = {
  success: false;
  error: string;
  message?: string;
};

type ApiResult<T> = ApiOk<T> | ApiFail;

const SUPPORTED_CHAINS = ['arbitrum', 'base', 'celo', 'polygon', 'optimism'] as const;
const SUPPORTED_TOKENS = ['USDC', 'USDT'] as const;

function toNumber(input: unknown, fallback = 0): number {
  const n = Number(input);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePhone(phoneNumber: string): string {
  return String(phoneNumber || '').trim().replace(/[\s()+-]/g, '');
}

function chainToChainId(chain: string): number | undefined {
  const v = String(chain || '').trim().toLowerCase();
  if (v === 'arbitrum') return 42161;
  if (v === 'base') return 8453;
  if (v === 'celo') return 42220;
  if (v === 'polygon') return 137;
  if (v === 'optimism') return 10;
  return undefined;
}

function mapMpesaStatus(status: string): BusinessTransaction['status'] {
  if (status === 'succeeded') return 'completed';
  if (status === 'failed' || status === 'refunded') return 'failed';
  if (status === 'created' || status === 'quoted' || status === 'awaiting_user_authorization' || status === 'awaiting_onchain_funding') {
    return 'pending';
  }
  return 'processing';
}

function mapMpesaToBusinessTransaction(tx: MpesaTransaction): BusinessTransaction {
  const type =
    tx.flowType === 'offramp'
      ? 'business_crypto_to_fiat'
      : tx.flowType === 'paybill'
      ? 'crypto_to_paybill'
      : tx.flowType === 'buygoods'
      ? 'crypto_to_till'
      : 'business_fiat_to_crypto';

  const chainId = tx.onchain?.chainId;
  const chain = chainId === 42161 || chainId === 421614 ? 'arbitrum' : 'mpesa';

  return {
    transactionId: tx.transactionId,
    type,
    status: mapMpesaStatus(tx.status),
    amount: toNumber(tx.quote?.amountUsd),
    tokenType: 'USDC',
    chain,
    createdAt: tx.createdAt,
    completedAt: tx.status === 'succeeded' || tx.status === 'failed' || tx.status === 'refunded' ? tx.updatedAt : undefined,
    transactionCategory: tx.flowType === 'onramp' ? 'onramp' : 'offramp',
    transactionSubType: tx.flowType === 'onramp' ? 'received' : 'sent',
    mpesaReceipt: tx.daraja?.receiptNumber || null,
  };
}

function emptyTokenBalance(): TokenBalance {
  return {
    balance: 0,
    usdValue: 0,
    kesValue: 0,
    price: 1,
  };
}

function createEmptyBusinessBalance(businessId: string): BusinessBalance {
  const balances: Record<string, ChainBalances> = {};
  for (const chain of SUPPORTED_CHAINS) {
    balances[chain] = {
      USDC: emptyTokenBalance(),
      USDT: emptyTokenBalance(),
    };
  }

  return {
    businessId,
    balances,
    overview: {
      totalUSDValue: 0,
      totalKESValue: 0,
      activeChains: [],
      totalTokens: {
        USDC: 0,
        USDT: 0,
      },
      lastUpdated: new Date().toISOString(),
    },
    summary: {
      supportedChains: [...SUPPORTED_CHAINS],
      supportedTokens: [...SUPPORTED_TOKENS],
      nonZeroChains: 0,
      nonZeroTokens: 0,
    },
  };
}

async function listBusinessMpesaTransactions(
  businessId: string,
  options: { limit?: number } = {}
): Promise<MpesaTransaction[]> {
  const response = await mpesaClient.listTransactions({ limit: options.limit || 100 });
  return response.data.transactions.filter((tx) => tx.businessId === businessId);
}

function applyBalanceFromTransactions(balance: BusinessBalance, transactions: MpesaTransaction[]) {
  for (const tx of transactions) {
    const chain =
      tx.onchain?.chainId === 42161 || tx.onchain?.chainId === 421614
        ? 'arbitrum'
        : tx.onchain?.chainId === 8453 || tx.onchain?.chainId === 84532
        ? 'base'
        : 'arbitrum';

    const current = balance.balances[chain] || {
      USDC: emptyTokenBalance(),
      USDT: emptyTokenBalance(),
    };

    const amountUsd = Math.max(0, toNumber(tx.quote?.amountUsd));
    const amountKes = Math.max(0, toNumber(tx.quote?.amountKes));
    const isTerminalFailure = tx.status === 'failed' || tx.status === 'refunded';

    if (tx.flowType === 'onramp' && tx.status === 'succeeded') {
      current.USDC.balance += amountUsd;
      current.USDC.usdValue += amountUsd;
      current.USDC.kesValue += amountKes;
    }

    if ((tx.flowType === 'offramp' || tx.flowType === 'paybill' || tx.flowType === 'buygoods') && !isTerminalFailure) {
      current.USDC.balance = Math.max(0, current.USDC.balance - amountUsd);
      current.USDC.usdValue = Math.max(0, current.USDC.usdValue - amountUsd);
      current.USDC.kesValue = Math.max(0, current.USDC.kesValue - amountKes);
    }

    balance.balances[chain] = current;
  }

  const totals = {
    usd: 0,
    kes: 0,
    tokens: {
      USDC: 0,
      USDT: 0,
    } as Record<string, number>,
    activeChains: [] as string[],
  };

  for (const [chain, chainBalances] of Object.entries(balance.balances)) {
    const chainUsd = toNumber(chainBalances.USDC?.usdValue) + toNumber(chainBalances.USDT?.usdValue);
    const chainKes = toNumber(chainBalances.USDC?.kesValue) + toNumber(chainBalances.USDT?.kesValue);

    totals.usd += chainUsd;
    totals.kes += chainKes;
    totals.tokens.USDC += toNumber(chainBalances.USDC?.balance);
    totals.tokens.USDT += toNumber(chainBalances.USDT?.balance);

    if (chainUsd > 0) {
      totals.activeChains.push(chain);
    }
  }

  balance.overview = {
    totalUSDValue: totals.usd,
    totalKESValue: totals.kes,
    activeChains: totals.activeChains,
    totalTokens: totals.tokens,
    lastUpdated: new Date().toISOString(),
  };

  balance.summary = {
    supportedChains: [...SUPPORTED_CHAINS],
    supportedTokens: [...SUPPORTED_TOKENS],
    nonZeroChains: totals.activeChains.length,
    nonZeroTokens: Object.values(totals.tokens).filter((v) => v > 0).length,
  };
}

function makeFailure<T>(message: string): ApiResult<T> {
  return {
    success: false,
    error: message,
    message,
  };
}

function buildMonthlyPayment(amount: number, months: number, annualRate = 8.5): number {
  const monthlyRate = annualRate / 100 / 12;
  if (months <= 0) return amount;
  return (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
}

export const businessFinanceAPI = {
  getBusinessBalance: async (businessId: string): Promise<ApiResult<BusinessBalance>> => {
    if (!businessId) return makeFailure<BusinessBalance>('businessId is required');

    try {
      const txs = await listBusinessMpesaTransactions(businessId, { limit: 100 });
      const balance = createEmptyBusinessBalance(businessId);
      applyBalanceFromTransactions(balance, txs);
      return {
        success: true,
        data: balance,
      };
    } catch (error: any) {
      return makeFailure<BusinessBalance>(error?.message || 'Failed to load business balance');
    }
  },

  getBusinessBalanceByChain: async (
    businessId: string,
    chain: string
  ): Promise<ApiResult<ChainSpecificBalance>> => {
    const normalizedChain = String(chain || '').trim().toLowerCase();
    if (!businessId) return makeFailure<ChainSpecificBalance>('businessId is required');
    if (!normalizedChain) return makeFailure<ChainSpecificBalance>('chain is required');

    const balanceResponse = await businessFinanceAPI.getBusinessBalance(businessId);
    if (!balanceResponse.success) return balanceResponse;

    const chainBalances =
      balanceResponse.data.balances[normalizedChain] || {
        USDC: emptyTokenBalance(),
        USDT: emptyTokenBalance(),
      };

    return {
      success: true,
      data: {
        businessId,
        chain: normalizedChain,
        balances: chainBalances,
        updatedAt: balanceResponse.data.overview.lastUpdated,
      },
    };
  },

  getBusinessTransactionHistory: async (
    businessId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      type?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ): Promise<ApiResult<BusinessTransactionHistory>> => {
    if (!businessId) return makeFailure<BusinessTransactionHistory>('businessId is required');

    try {
      const page = Math.max(1, Number(options.page) || 1);
      const limit = Math.max(1, Math.min(Number(options.limit) || 20, 100));

      const txs = await listBusinessMpesaTransactions(businessId, { limit: 100 });
      let mapped = txs.map(mapMpesaToBusinessTransaction);

      if (options.status) {
        mapped = mapped.filter((tx) => tx.status === options.status);
      }
      if (options.type) {
        mapped = mapped.filter((tx) => tx.type === options.type);
      }
      if (options.dateFrom) {
        const from = new Date(options.dateFrom);
        mapped = mapped.filter((tx) => new Date(tx.createdAt) >= from);
      }
      if (options.dateTo) {
        const to = new Date(options.dateTo);
        mapped = mapped.filter((tx) => new Date(tx.createdAt) <= to);
      }

      mapped = mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const start = (page - 1) * limit;
      const paged = mapped.slice(start, start + limit);
      const pages = mapped.length === 0 ? 1 : Math.ceil(mapped.length / limit);

      return {
        success: true,
        data: {
          transactions: paged,
          summary: {
            total: mapped.length,
            page,
            limit,
            pages,
            hasNext: page < pages,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error: any) {
      return makeFailure<BusinessTransactionHistory>(error?.message || 'Failed to load business transactions');
    }
  },

  withdrawToPersonal: async (
    request: WithdrawToPersonalRequest
  ): Promise<ApiResult<WithdrawToPersonalResponse>> => {
    if (!request.businessId) return makeFailure<WithdrawToPersonalResponse>('businessId is required');
    if (!request.amount || request.amount <= 0) return makeFailure<WithdrawToPersonalResponse>('amount must be greater than 0');

    return makeFailure<WithdrawToPersonalResponse>(
      'Personal transfer endpoint is not yet available on DotPayBE. Use M-Pesa withdrawal for now.'
    );
  },

  withdrawToMpesa: async (
    request: WithdrawToMpesaRequest
  ): Promise<ApiResult<WithdrawToMpesaResponse>> => {
    const phoneNumber = normalizePhone(request.phoneNumber);

    if (!request.businessId) return makeFailure<WithdrawToMpesaResponse>('businessId is required');
    if (!request.amount || request.amount <= 0) return makeFailure<WithdrawToMpesaResponse>('amount must be greater than 0');
    if (!/^254\d{9}$/.test(phoneNumber)) {
      return makeFailure<WithdrawToMpesaResponse>('phoneNumber must be in 2547XXXXXXXX format');
    }

    try {
      const quoteRes = await mpesaClient.createQuote({
        flowType: 'offramp',
        amount: request.amount,
        currency: 'KES',
        phoneNumber,
        businessId: request.businessId,
      });

      const signature =
        request.signature ||
        `biz-signature-${Date.now()}-${Math.random().toString(36).slice(2).padEnd(24, 'x').slice(0, 24)}`;
      const pin = request.pin || '0000';

      const initiateRes = await mpesaClient.initiateOfframp({
        quoteId: quoteRes.data.quote.quoteId,
        phoneNumber,
        pin,
        signature,
        signedAt: new Date().toISOString(),
        businessId: request.businessId,
        chainId: chainToChainId(request.chain),
      });

      return {
        success: true,
        data: {
          transactionId: initiateRes.data.transactionId,
          status: initiateRes.data.status,
          flowType: initiateRes.data.flowType,
          amountKes: toNumber(initiateRes.data.quote.amountKes),
          amountUsd: toNumber(initiateRes.data.quote.amountUsd),
          phoneNumber,
          quoteId: initiateRes.data.quote.quoteId,
          receiptNumber: initiateRes.data.daraja?.receiptNumber || null,
          initiatedAt: initiateRes.data.createdAt,
          transaction: initiateRes.data,
        },
      };
    } catch (error: any) {
      return makeFailure<WithdrawToMpesaResponse>(error?.message || 'Failed to initiate M-Pesa withdrawal');
    }
  },

  getBusinessCreditScore: async (businessId: string): Promise<ApiResult<BusinessCreditScore>> => {
    if (!businessId) return makeFailure<BusinessCreditScore>('businessId is required');

    try {
      const txs = await listBusinessMpesaTransactions(businessId, { limit: 100 });
      const completed = txs.filter((tx) => tx.status === 'succeeded').length;
      const failed = txs.filter((tx) => tx.status === 'failed' || tx.status === 'refunded').length;
      const total = txs.length;
      const successRate = total === 0 ? 100 : (completed / total) * 100;

      const totalVolume = txs.reduce((sum, tx) => sum + toNumber(tx.quote?.amountUsd), 0);
      const monthlyVolume = txs
        .filter((tx) => {
          const created = new Date(tx.createdAt).getTime();
          return Date.now() - created <= 30 * 24 * 60 * 60 * 1000;
        })
        .reduce((sum, tx) => sum + toNumber(tx.quote?.amountUsd), 0);

      const creditScore = Math.max(300, Math.min(850, Math.round(500 + successRate * 3 + Math.min(200, totalVolume / 50))));
      const creditLimit = Math.max(1000, Math.round(totalVolume * 0.25 + 2000));
      const currentCredit = Math.max(0, failed * 150);
      const availableCredit = Math.max(0, creditLimit - currentCredit);

      return {
        success: true,
        data: {
          creditScore,
          riskLevel: creditScore >= 750 ? 'low' : creditScore >= 650 ? 'medium' : 'high',
          creditLimit,
          availableCredit,
          totalVolume,
          monthlyVolume,
          currentCredit,
          paymentHistory: {
            totalPayments: total,
            completedPayments: completed,
            successRate,
          },
          recommendations:
            successRate >= 90
              ? ['Maintain your current settlement performance.', 'Increase weekly volume gradually to unlock better limits.']
              : ['Improve completion rate to raise your score.', 'Keep failed payouts low by confirming receiver details before submitting.'],
          lastAssessment: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return makeFailure<BusinessCreditScore>(error?.message || 'Failed to load business credit score');
    }
  },

  applyForLoan: async (
    request: LoanApplicationRequest
  ): Promise<ApiResult<LoanApplicationResponse>> => {
    if (!request.businessId) return makeFailure<LoanApplicationResponse>('businessId is required');
    if (!request.loanAmount || request.loanAmount <= 0) return makeFailure<LoanApplicationResponse>('loanAmount must be greater than 0');
    if (!request.purpose?.trim()) return makeFailure<LoanApplicationResponse>('purpose is required');
    if (!request.repaymentPeriod || request.repaymentPeriod <= 0) {
      return makeFailure<LoanApplicationResponse>('repaymentPeriod must be greater than 0');
    }

    const monthlyPayment = buildMonthlyPayment(request.loanAmount, request.repaymentPeriod, 8.5);

    return {
      success: true,
      data: {
        loanApplication: {
          loanId: `LN-${Date.now().toString(36).toUpperCase()}`,
          businessName: 'Business Account',
          loanAmount: request.loanAmount,
          purpose: request.purpose,
          repaymentPeriod: request.repaymentPeriod,
          interestRate: 8.5,
          monthlyPayment,
          status: 'pending_approval',
        },
        nextSteps: [
          'We will review your application and transaction profile.',
          'A credit decision will be posted to your business dashboard.',
          'If approved, funds are disbursed to your connected business wallet.',
        ],
        estimatedApprovalTime: '24-48 hours',
      },
    };
  },
};
