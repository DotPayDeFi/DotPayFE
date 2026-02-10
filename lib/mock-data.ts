/**
 * Mock Data Utilities
 * Provides mock data for all features to maintain UI functionality
 * without external API dependencies
 */

// Mock User Data
export interface MockUser {
  id: string;
  email: string;
  phoneNumber: string;
  googleId?: string;
  arbitrumWallet?: string;
  celoWallet?: string;
  walletAddress?: string;
  stellarAccountId?: string;
  token: string;
}

// Mock Wallet Data
export interface MockWalletDetails {
  walletAddress: string;
  phoneNumber: string;
  email: string;
  supportedChains: Array<{ name: string; id: string; chainId: number }>;
  note: string;
  address?: string;
  totalUsdValue?: string;
  chains?: string[];
  balances?: Array<{
    token: string;
    balance: string;
    usdValue: string;
    chain: string;
  }>;
}

export interface MockBalanceData {
  walletAddress: string;
  totalUSDValue: number;
  balances: {
    [chain: string]: {
      [token: string]: number;
    };
  };
  chainsWithBalance: number;
  lastUpdated: string;
}

export interface MockStellarBalance {
  asset: string;
  balance: string;
  usdValue: string;
}

export interface MockBusinessAccount {
  businessId: string;
  businessName: string;
  merchantId: string;
  phoneNumber: string;
  email: string;
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
}

export interface MockTransaction {
  id: string;
  type: 'send' | 'receive' | 'payment' | 'deposit' | 'withdrawal';
  amount: string;
  token: string;
  chain: string;
  from?: string;
  to?: string;
  txHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  description?: string;
}

// Generate mock user
export const generateMockUser = (email?: string, phoneNumber?: string): MockUser => {
  return {
    id: `user_${Date.now()}`,
    email: email || 'demo@dotpay.com',
    phoneNumber: phoneNumber || '+254712345678',
    arbitrumWallet: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    celoWallet: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    walletAddress: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    stellarAccountId: 'G' + Array.from({ length: 56 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]).join(''),
    token: `mock_token_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  };
};

// Generate mock wallet details
export const generateMockWallet = (user?: MockUser): MockWalletDetails => {
  const walletAddress = user?.walletAddress || '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  
  return {
    walletAddress,
    phoneNumber: user?.phoneNumber || '+254712345678',
    email: user?.email || 'demo@dotpay.com',
    supportedChains: [
      { name: 'Arbitrum', id: 'arbitrum', chainId: 42161 },
      { name: 'Celo', id: 'celo', chainId: 42220 },
      { name: 'Polygon', id: 'polygon', chainId: 137 },
      { name: 'Base', id: 'base', chainId: 8453 },
      { name: 'Ethereum', id: 'ethereum', chainId: 1 },
    ],
    note: 'Your DotPay wallet address',
    address: walletAddress,
    totalUsdValue: '1250.50',
    chains: ['arbitrum', 'celo', 'polygon'],
    balances: [
      { token: 'USDC', balance: '1000.00', usdValue: '1000.00', chain: 'arbitrum' },
      { token: 'USDT', balance: '250.50', usdValue: '250.50', chain: 'celo' },
    ],
  };
};

// Generate mock balance data
export const generateMockBalance = (walletAddress?: string): MockBalanceData => {
  return {
    walletAddress: walletAddress || '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    totalUSDValue: 1250.50,
    balances: {
      arbitrum: {
        USDC: 1000.00,
        ETH: 0.5,
      },
      celo: {
        USDT: 250.50,
        CELO: 10.0,
      },
      polygon: {
        USDC: 0,
      },
    },
    chainsWithBalance: 2,
    lastUpdated: new Date().toISOString(),
  };
};

// Generate mock Stellar wallet
export const generateMockStellarWallet = (): {
  accountId: string;
  balances: MockStellarBalance[];
  isActive: boolean;
} => {
  return {
    accountId: 'G' + Array.from({ length: 56 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]).join(''),
    balances: [
      { asset: 'XLM', balance: '1000.0000000', usdValue: '150.00' },
      { asset: 'USDC', balance: '500.0000000', usdValue: '500.00' },
    ],
    isActive: true,
  };
};

// Generate mock business accounts
export const generateMockBusinessAccounts = (): MockBusinessAccount[] => {
  return [
    {
      businessId: 'biz_1',
      businessName: 'Demo Business',
      merchantId: 'merchant_123',
      phoneNumber: '+254712345678',
      email: 'business@demo.com',
      status: 'active',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

// Generate mock transactions with proper structure
export const generateMockTransactions = (count: number = 10): any[] => {
  const types: Array<'fiat_to_crypto' | 'crypto_to_fiat' | 'crypto_to_paybill' | 'crypto_to_till' | 'token_transfer'> = [
    'token_transfer', 'fiat_to_crypto', 'crypto_to_fiat', 'token_transfer', 'token_transfer'
  ];
  const tokens = [
    { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
    { symbol: 'XLM', name: 'Stellar', decimals: 7 }
  ];
  const chains = [
    { chain: 'arbitrum', network: 'Arbitrum One', explorerName: 'Arbiscan' },
    { chain: 'celo', network: 'Celo Mainnet', explorerName: 'CeloScan' },
    { chain: 'polygon', network: 'Polygon', explorerName: 'PolygonScan' },
    { chain: 'stellar', network: 'Stellar', explorerName: 'Stellar Explorer' }
  ];
  const statuses: Array<'pending' | 'processing' | 'completed' | 'failed'> = ['completed', 'completed', 'pending', 'processing', 'completed'];
  
  return Array.from({ length: count }, (_, i) => {
    const type = types[Math.floor(Math.random() * types.length)];
    const tokenData = tokens[Math.floor(Math.random() * tokens.length)];
    const chainData = chains[Math.floor(Math.random() * chains.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const amount = parseFloat((Math.random() * 1000).toFixed(2));
    const usdAmount = amount;
    const kesAmount = usdAmount * 133.5; // Approximate KES rate
    const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const createdAt = new Date(Date.now() - i * 60 * 60 * 1000);
    const ageMinutes = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60));
    
    return {
      id: `tx_${Date.now()}_${i}`,
      type,
      status,
      amount,
      token: {
        symbol: tokenData.symbol,
        name: tokenData.name,
        amount: amount,
        decimals: tokenData.decimals,
      },
      values: {
        fiat: {
          amount: kesAmount,
          currency: 'KES',
          formatted: `KES ${Math.round(kesAmount)}`,
        },
        usd: {
          amount: usdAmount,
          formatted: `$${usdAmount.toFixed(2)}`,
        },
        kes: {
          amount: kesAmount,
          formatted: `KES ${Math.round(kesAmount)}`,
        },
      },
      blockchain: {
        chain: chainData.chain,
        network: chainData.network,
        txHash: txHash,
        explorerUrl: `https://${chainData.chain === 'arbitrum' ? 'arbiscan.io' : chainData.chain === 'celo' ? 'celoscan.io' : chainData.chain === 'polygon' ? 'polygonscan.com' : 'stellar.expert'}/tx/${txHash}`,
        explorerName: chainData.explorerName,
        isConfirmed: status === 'completed',
        confirmations: status === 'completed' ? 10 : 0,
      },
      timing: {
        createdAt: createdAt.toISOString(),
        completedAt: status === 'completed' ? new Date(createdAt.getTime() + 30 * 1000).toISOString() : undefined,
        processingTimeSeconds: status === 'completed' ? 30 : undefined,
        ageMinutes: ageMinutes,
        formatted: {
          created: createdAt.toLocaleString(),
          completed: status === 'completed' ? new Date(createdAt.getTime() + 30 * 1000).toLocaleString() : undefined,
        },
      },
      dashboard: {
        priority: 'normal',
        category: type === 'token_transfer' ? 'transfer' : type === 'fiat_to_crypto' ? 'buy' : 'sell',
        statusColor: status === 'completed' ? 'green' : status === 'pending' ? 'yellow' : status === 'processing' ? 'blue' : 'red',
        icon: type === 'token_transfer' ? 'send' : type === 'fiat_to_crypto' ? 'buy' : 'sell',
        summary: `${type === 'token_transfer' ? 'Sent' : type === 'fiat_to_crypto' ? 'Bought' : 'Sold'} ${amount} ${tokenData.symbol} on ${chainData.network} - $${usdAmount.toFixed(2)} (KES ${Math.round(kesAmount)})`,
      },
      portfolio: {
        impact: type === 'crypto_to_fiat' || (type === 'token_transfer' && i % 2 === 0) ? 'negative' : 'positive',
        direction: type === 'crypto_to_fiat' || (type === 'token_transfer' && i % 2 === 0) ? '-' : '+',
        description: type === 'token_transfer' ? 'Token transfer' : type === 'fiat_to_crypto' ? 'Bought crypto' : 'Sold crypto',
      },
      references: {
        transactionId: `TXN_${Date.now()}_${i}`,
        mpesaTransactionId: type === 'fiat_to_crypto' || type === 'crypto_to_fiat' ? `MPESA_${Date.now()}_${i}` : null,
        retryCount: 0,
      },
    };
  });
};

// Simulate API delay
export const simulateDelay = (ms: number = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Mock API Response wrapper
export const createMockResponse = <T>(data: T, message: string = 'Success', success: boolean = true) => {
  return {
    success,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
};
