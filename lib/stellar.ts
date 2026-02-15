/**
 * Stellar API - local stub for wallet/payment UX surfaces.
 *
 * M-Pesa-specific Stellar paths were removed in favor of the dedicated Daraja flow.
 */

import { generateMockStellarWallet, simulateDelay } from './mock-data';

export type StellarAsset = 'XLM' | 'USDC';

export type StellarBalance = {
  asset: string;
  balance: string;
  usdValue: number;
};

export type StellarTransaction = {
  id: string;
  transactionHash: string;
  amount: string;
  asset: StellarAsset;
  toAccountId: string;
  fromAccountId: string;
  memo?: string;
  createdAt: string;
  status: 'pending' | 'completed' | 'failed';
};

export type StellarWalletResponse = {
  success: boolean;
  message?: string;
  data: {
    accountId: string;
    balances: StellarBalance[];
    sequence: string;
    isActive: boolean;
    createdAt?: string;
  };
};

export type StellarSecretKeyResponse = {
  success: boolean;
  message?: string;
  data: {
    accountId: string;
    secretKey: string;
    warning: string;
  };
};

export type StellarSendPaymentData = {
  toAccountId: string;
  amount: string;
  asset: StellarAsset;
  memo?: string;
};

export type StellarSendPaymentResponse = {
  success: boolean;
  message?: string;
  data: {
    transactionHash: string;
    transactionId: string;
    amount: string;
    asset: string;
    recipient: string;
  };
};

export const STELLAR_SUPPORTED_ASSETS: StellarAsset[] = ['XLM', 'USDC'];

function createHex(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function createMockTransaction(input: StellarSendPaymentData): StellarTransaction {
  const txId = `stx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id: txId,
    transactionHash: createHex(64),
    amount: input.amount,
    asset: input.asset,
    toAccountId: input.toAccountId,
    fromAccountId: `G${createHex(55).toUpperCase()}`,
    memo: input.memo,
    createdAt: new Date().toISOString(),
    status: 'completed',
  };
}

export const stellarWalletAPI = {
  getWallet: async (): Promise<StellarWalletResponse> => {
    await simulateDelay(400);
    const wallet = generateMockStellarWallet();
    return {
      success: true,
      data: {
        accountId: wallet.accountId,
        balances: wallet.balances.map((b: any) => ({
          asset: b.asset,
          balance: b.balance,
          usdValue: Number.parseFloat(b.usdValue),
        })),
        sequence: '0',
        isActive: wallet.isActive,
        createdAt: new Date().toISOString(),
      },
    };
  },

  createWallet: async (): Promise<StellarWalletResponse> => {
    await simulateDelay(700);
    return stellarWalletAPI.getWallet();
  },

  getSecretKey: async (): Promise<StellarSecretKeyResponse> => {
    await simulateDelay(350);
    return {
      success: true,
      data: {
        accountId: `G${createHex(55).toUpperCase()}`,
        secretKey: `S${createHex(55).toUpperCase()}`,
        warning: 'Keep this secret key secure and never share it',
      },
    };
  },

  validateAddress: async ({ address }: { address: string }) => {
    await simulateDelay(120);
    const value = String(address || '').trim().toUpperCase();
    const valid = /^G[A-Z2-7]{55}$/.test(value);
    return {
      success: true,
      data: { valid },
    };
  },

  getBalance: async (asset?: StellarAsset) => {
    await simulateDelay(180);
    const wallet = await stellarWalletAPI.getWallet();
    const balances = wallet.data.balances;
    if (!asset) {
      return {
        success: true,
        data: { balances },
      };
    }

    const target = balances.find((b) => b.asset === asset) || {
      asset,
      balance: '0',
      usdValue: 0,
    };

    return {
      success: true,
      data: target,
    };
  },

  getAllBalances: async () => {
    await simulateDelay(200);
    const wallet = await stellarWalletAPI.getWallet();
    return {
      success: true,
      data: {
        balances: wallet.data.balances,
      },
    };
  },
};

export const stellarPaymentAPI = {
  sendPayment: async (data: StellarSendPaymentData): Promise<StellarSendPaymentResponse> => {
    await simulateDelay(900);
    const tx = createMockTransaction(data);
    return {
      success: true,
      data: {
        transactionHash: tx.transactionHash,
        transactionId: tx.id,
        amount: tx.amount,
        asset: tx.asset,
        recipient: tx.toAccountId,
      },
    };
  },

  getTransactionHistory: async (limit: number = 10, _cursor?: string) => {
    await simulateDelay(250);
    const size = Math.max(1, Math.min(Number(limit) || 10, 30));
    const transactions: StellarTransaction[] = Array.from({ length: size }).map((_, idx) => {
      const createdAt = new Date(Date.now() - idx * 60_000).toISOString();
      return {
        id: `stx_${Date.now()}_${idx}`,
        transactionHash: createHex(64),
        amount: (Math.random() * 5 + 0.1).toFixed(4),
        asset: idx % 2 === 0 ? 'USDC' : 'XLM',
        toAccountId: `G${createHex(55).toUpperCase()}`,
        fromAccountId: `G${createHex(55).toUpperCase()}`,
        createdAt,
        status: 'completed',
      };
    });

    return {
      success: true,
      data: {
        transactions,
      },
    };
  },
};

export const stellarUtils = {
  formatAddress: (address: string) => {
    const value = String(address || '');
    if (value.length < 12) return value;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  },

  formatAmount: (amount: string | number, decimals: number = 2) => {
    const n = Number(amount);
    if (!Number.isFinite(n)) return '0';
    return n.toFixed(Math.max(0, decimals));
  },

  isValidStellarAddress: (address: string) => {
    const value = String(address || '').trim().toUpperCase();
    return /^G[A-Z2-7]{55}$/.test(value);
  },
};
