import { ApiResponse } from './wallet';

type PhoneInput = { phone?: string; phoneNumber?: string };
type AuthMode = 'none' | 'user';
type HttpMethod = 'GET' | 'POST';

type AxiosLikeError = Error & {
  response?: {
    status: number;
    data: any;
  };
};

export type DepositData = {
  amount: string | number;
  token?: string;
  chain?: string;
} & PhoneInput;

export type BuyCryptoData = {
  amount: number | string;
  chain: string;
  tokenType?: string;
  tokenSymbol?: string;
  currency?: 'KES' | 'USD';
} & PhoneInput;

export type WithdrawData = {
  amount: string | number;
  businessId?: string;
  token?: string;
  tokenSymbol?: string;
  chain?: string;
} & PhoneInput;

export type CryptoToMpesaData = {
  amount: number | string;
  tokenType?: string;
  chain?: string;
  password?: string;
  googleAuthCode?: string;
  description?: string;
} & PhoneInput;

export type PayBillData = {
  businessNumber: string;
  accountNumber: string;
  amount: string | number;
  token: string;
  chain: string;
} & PhoneInput;

export type PayTillData = {
  tillNumber: string;
  amount: string | number;
  token: string;
  chain: string;
} & PhoneInput;

export type PayWithCryptoData = {
  amount: number;
  cryptoAmount: number;
  targetType: 'paybill' | 'till';
  targetNumber: string;
  accountNumber?: string;
  token?: string;
  tokenType?: string;
  chain: string;
  description?: string;
  password?: string;
  googleAuthCode?: string;
};

export type SubmitReceiptData = {
  mpesaReceiptNumber: string;
  transactionId: string;
};

export type CryptoToMpesaResponse = {
  transactionId: string;
  status: string;
  amount: number;
  phoneNumber: string;
};

const MPESA_API_PREFIX = '/api/mpesa';

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const createApiError = (status: number, data: any, fallbackMessage: string): AxiosLikeError => {
  const message =
    (data && typeof data === 'object' && typeof data.message === 'string' && data.message) || fallbackMessage;
  const error = new Error(message) as AxiosLikeError;
  error.response = { status, data };
  return error;
};

const parseAmount = (value: string | number, fieldName = 'amount'): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw createApiError(400, { message: `${fieldName} must be a positive number` }, `Invalid ${fieldName}`);
  }
  return parsed;
};

const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('dotpay_token');
};

const getStoredUserPhone = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const raw = localStorage.getItem('dotpay_user');
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw);
    return parsed?.phoneNumber || parsed?.user?.phoneNumber;
  } catch {
    return undefined;
  }
};

const resolvePhone = (input?: PhoneInput): string | undefined => {
  return input?.phone || input?.phoneNumber || getStoredUserPhone();
};

const getBackendBaseUrl = (): string => {
  const envBase = process.env.NEXT_PUBLIC_DOTPAY_API_URL?.trim();
  if (envBase) return trimTrailingSlash(envBase);

  if (typeof window !== 'undefined') {
    return trimTrailingSlash(window.location.origin);
  }

  return '';
};

const buildMpesaUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getBackendBaseUrl();
  if (!base) return `${MPESA_API_PREFIX}${normalizedPath}`;
  return `${base}${MPESA_API_PREFIX}${normalizedPath}`;
};

const buildGeneralApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getBackendBaseUrl();
  if (!base) return normalizedPath;
  return `${base}${normalizedPath}`;
};

const readResponsePayload = async (response: Response): Promise<any> => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const normalizeResponse = <T>(payload: any, fallbackMessage: string): ApiResponse<T> => {
  if (payload && typeof payload === 'object' && typeof payload.success === 'boolean') {
    return {
      success: payload.success,
      message: typeof payload.message === 'string' ? payload.message : fallbackMessage,
      data: payload.data !== undefined ? payload.data : payload,
      timestamp: payload.timestamp || new Date().toISOString(),
    } as ApiResponse<T>;
  }

  if (payload && typeof payload === 'object') {
    const data = payload.data !== undefined ? payload.data : payload;
    const message = typeof payload.message === 'string' ? payload.message : fallbackMessage;
    return {
      success: true,
      message,
      data: data as T,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    success: true,
    message: fallbackMessage,
    data: payload as T,
    timestamp: new Date().toISOString(),
  };
};

const requestMpesa = async <T>(
  path: string,
  options: {
    method?: HttpMethod;
    body?: Record<string, any>;
    authMode?: AuthMode;
    fallbackSuccessMessage: string;
  }
): Promise<ApiResponse<T>> => {
  const { method = 'POST', body, authMode = 'user', fallbackSuccessMessage } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authMode === 'user') {
    const token = getAuthToken();
    if (!token) {
      throw createApiError(401, { message: 'Authentication required' }, 'Authentication required');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(buildMpesaUrl(path), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch (error: any) {
    throw createApiError(0, { message: error?.message || 'Network request failed' }, 'Network request failed');
  }

  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw createApiError(
      response.status,
      payload || { message: `M-Pesa API request failed (${response.status})` },
      `M-Pesa API request failed (${response.status})`
    );
  }

  return normalizeResponse<T>(payload, fallbackSuccessMessage);
};

const requestGeneralApi = async <T>(
  path: string,
  fallbackSuccessMessage: string
): Promise<ApiResponse<T>> => {
  let response: Response;
  try {
    response = await fetch(buildGeneralApiUrl(path), { method: 'GET', cache: 'no-store' });
  } catch (error: any) {
    throw createApiError(0, { message: error?.message || 'Network request failed' }, 'Network request failed');
  }

  const payload = await readResponsePayload(response);
  if (!response.ok) {
    throw createApiError(
      response.status,
      payload || { message: `API request failed (${response.status})` },
      `API request failed (${response.status})`
    );
  }

  return normalizeResponse<T>(payload, fallbackSuccessMessage);
};

const deposit = async (data: DepositData): Promise<ApiResponse> => {
  const phone = resolvePhone(data);
  if (!phone) {
    throw createApiError(400, { message: 'phone is required' }, 'phone is required');
  }

  return requestMpesa('/deposit', {
    body: {
      amount: parseAmount(data.amount),
      phone,
    },
    fallbackSuccessMessage: 'Deposit initiated successfully',
  });
};

const buyCrypto = async (data: BuyCryptoData): Promise<ApiResponse> => {
  const phone = resolvePhone(data);
  if (!phone) {
    throw createApiError(400, { message: 'phone is required' }, 'phone is required');
  }

  return requestMpesa('/buy-crypto', {
    body: {
      amount: parseAmount(data.amount),
      phone,
      chain: data.chain,
      tokenType: data.tokenType || data.tokenSymbol || 'USDC',
    },
    fallbackSuccessMessage: 'Buy crypto request submitted',
  });
};

const withdraw = async (data: WithdrawData): Promise<ApiResponse> => {
  if (data.businessId) {
    return requestMpesa('/withdraw', {
      body: {
        amount: parseAmount(data.amount),
        businessId: data.businessId,
      },
      fallbackSuccessMessage: 'Withdrawal initiated',
    });
  }

  const phone = resolvePhone(data);
  if (!phone) {
    throw createApiError(400, { message: 'phone is required' }, 'phone is required');
  }

  return requestMpesa('/crypto-to-mpesa', {
    body: {
      amount: parseAmount(data.amount),
      phone,
      tokenType: data.tokenSymbol || data.token || 'USDC',
      chain: data.chain || 'celo',
    },
    fallbackSuccessMessage: 'Crypto to M-Pesa withdrawal initiated',
  });
};

const cryptoToMpesa = async (data: CryptoToMpesaData): Promise<ApiResponse<CryptoToMpesaResponse>> => {
  const phone = resolvePhone(data);
  if (!phone) {
    throw createApiError(400, { message: 'phone is required' }, 'phone is required');
  }

  return requestMpesa('/crypto-to-mpesa', {
    body: {
      amount: parseAmount(data.amount),
      phone,
      tokenType: data.tokenType || 'USDC',
      chain: data.chain || 'celo',
      ...(data.password ? { password: data.password } : {}),
      ...(data.googleAuthCode ? { googleAuthCode: data.googleAuthCode } : {}),
      ...(data.description ? { description: data.description } : {}),
    },
    fallbackSuccessMessage: 'Crypto to M-Pesa initiated',
  });
};

const payBill = async (data: PayBillData): Promise<ApiResponse> => {
  return requestMpesa('/pay/paybill', {
    body: {
      amount: parseAmount(data.amount),
      businessNumber: data.businessNumber,
      paybillNumber: data.businessNumber,
      accountNumber: data.accountNumber,
      phone: resolvePhone(data),
      chain: data.chain,
      tokenType: data.token,
    },
    fallbackSuccessMessage: 'Paybill payment initiated',
  });
};

const payTill = async (data: PayTillData): Promise<ApiResponse> => {
  return requestMpesa('/pay/till', {
    body: {
      amount: parseAmount(data.amount),
      tillNumber: data.tillNumber,
      phone: resolvePhone(data),
      chain: data.chain,
      tokenType: data.token,
    },
    fallbackSuccessMessage: 'Till payment initiated',
  });
};

const payWithCrypto = async (data: PayWithCryptoData): Promise<ApiResponse> => {
  return requestMpesa('/pay-with-crypto', {
    body: {
      amount: parseAmount(data.amount),
      cryptoAmount: parseAmount(data.cryptoAmount, 'cryptoAmount'),
      targetType: data.targetType,
      targetNumber: data.targetNumber,
      ...(data.accountNumber ? { accountNumber: data.accountNumber } : {}),
      chain: data.chain,
      tokenType: data.tokenType || data.token || 'USDC',
      ...(data.description ? { description: data.description } : {}),
      ...(data.password ? { password: data.password } : {}),
      ...(data.googleAuthCode ? { googleAuthCode: data.googleAuthCode } : {}),
    },
    fallbackSuccessMessage: 'B2B payment initiated',
  });
};

const submitReceipt = async (data: SubmitReceiptData): Promise<ApiResponse> => {
  return requestMpesa('/submit-receipt', {
    body: data,
    fallbackSuccessMessage: 'Receipt submitted successfully',
  });
};

const getTransactionStatus = async (transactionId: string): Promise<ApiResponse> => {
  if (!transactionId) {
    throw createApiError(400, { message: 'transactionId is required' }, 'transactionId is required');
  }

  return requestMpesa(`/transaction/${encodeURIComponent(transactionId)}`, {
    method: 'GET',
    fallbackSuccessMessage: 'Transaction status fetched',
  });
};

const getExchangeRate = async (_token: string, _chain: string): Promise<ApiResponse<{ rate: number }>> => {
  return requestGeneralApi<{ rate: number }>('/api/usdc/conversionrate', 'Exchange rate loaded');
};

export const mpesaAPI = {
  deposit,
  buyCrypto,
  withdraw,
  payBill,
  payTill,
  payWithCrypto,
  cryptoToMpesa,
  submitReceipt,
  getTransactionStatus,
  getExchangeRate,

  // Flow groupings used for documentation and direct usage.
  c2b: {
    deposit,
    buyCrypto,
    payBill,
    payTill,
  },
  b2c: {
    withdraw,
    cryptoToMpesa,
  },
  b2b: {
    payWithCrypto,
  },
};
