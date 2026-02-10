export type TransactionsType = {
  blockHash: string;
  blockNumber: string;
  confirmations: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  from: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  hash: string;
  input: string;
  nonce: string;
  timeStamp: string;
  to: string;
  tokenDecimal: string;
  tokenName: string;
  tokenSymbol: string;
  transactionIndex: string;
  value: string;
};

export type ConversionRateType = {
  rate: number;
}

export type BalanceData = {
  balanceInUSDC: number;
  balanceInKES: string;
  rate: number;
}

// Define context type
export type BalanceContextType = {
  isLoading: boolean;
  data: BalanceData;
  error: any; // Change to appropriate error type
}

export type BalanceApiResponseType = {
  data: {
    token: string;
    message: string;
    arbitrumWallet: string;
    celoWallet: string;
    phoneNumber: string;
  };
  status: number;
  statusText: string;
  headers: {
    "cache-control": string;
    "content-length": string;
    "content-type": string;
  };
  config: {
    transitional: {
      silentJSONParsing: boolean;
      forcedJSONParsing: boolean;
      clarifyTimeoutError: boolean;
    };
    adapter: string[];
    transformRequest: Array<null>;
    transformResponse: Array<null>;
    timeout: number;
    xsrfCookieName: string;
    xsrfHeaderName: string;
    maxContentLength: number;
    maxBodyLength: number;
    env: Record<string, unknown>;
    headers: {
      Accept: string;
      "Content-Type": string;
    };
    baseURL: string;
    method: string;
    url: string;
    data: string;
  };
  request: Record<string, unknown>;
};

export type Transaction = {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
}

export type LoginResponseData = {
  token: string;
  message: string;
  arbitrumWallet: string;
  phoneNumber: string;
}

export type LoginResponse = {
  data: {
    token: string;
    message: string;
    arbitrumWallet: string;
    phoneNumber: string;
  };
  status: number;
  statusText: string;
  headers: {
    "cache-control": string;
    "content-length": string;
    "content-type": string;
  };
  config: {
    transitional: {
      silentJSONParsing: boolean;
      forcedJSONParsing: boolean;
      clarifyTimeoutError: boolean;
    };
    adapter: string[];
    transformRequest: (null)[];
    transformResponse: (null)[];
    timeout: number;
    xsrfCookieName: string;
    xsrfHeaderName: string;
    maxContentLength: number;
    maxBodyLength: number;
    env: Record<string, unknown>;
    headers: {
      Accept: string;
      "Content-Type": string;
    };
    baseURL: string;
    method: string;
    url: string;
    data: string;
  };
  request: Record<string, unknown>;
};

// New type for crypto-to-mpesa response
export type CryptoToMpesaResponse = {
  success: boolean;
  message: string;
  data: {
    transactionId: string;
    amount: number;
    cryptoAmount: number;
    status: string;
    mpesaTransactionId: string;
    createdAt: string;
    estimatedCompletionTime: string;
    message: string;
    transactionDetails: {
      type: string;
      chain: string;
      tokenType: string;
      recipientPhone: string;
      exchangeRate: number;
      fees: {
        amount: string;
        percentage: number;
      };
      blockchainTransaction: {
        hash: string;
        explorerUrl: string;
      };
    };
  } | null;
  error: {
    code: string;
    message: string;
  } | null;
}