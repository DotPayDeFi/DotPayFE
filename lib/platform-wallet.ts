import apiClient from './api';
import { ApiResponse } from './wallet';

// Types
export interface PlatformWalletStatus {
  address: string;
  totalFeesCollected: string;
  totalVolume: string;
  activeUsers: number;
  chains: string[];
}

export interface TokenBalance {
  token: string;
  balance: string;
  usdValue: string;
  chain: string;
}

export interface WithdrawFeesData {
  token: string;
  amount: string;
  chain: string;
  destination: string;
}

export interface TransferFeesData {
  token: string;
  amount: string;
  fromChain: string;
  toChain: string;
}

// Platform Wallet API (Admin Operations)
export const platformWalletAPI = {
  // Get platform wallet status
  getStatus: async (): Promise<ApiResponse<PlatformWalletStatus>> => {
    const response = await apiClient.get('/platform-wallet/status');
    return response.data;
  },

  // Get specific token balance
  getTokenBalance: async (token: string): Promise<ApiResponse<TokenBalance>> => {
    const response = await apiClient.get(`/platform-wallet/balance/${token}`);
    return response.data;
  },

  // Get all token balances
  getAllBalances: async (): Promise<ApiResponse<TokenBalance[]>> => {
    const response = await apiClient.get('/platform-wallet/balances');
    return response.data;
  },

  // Withdraw fees (admin only)
  withdrawFees: async (data: WithdrawFeesData): Promise<ApiResponse> => {
    const response = await apiClient.post('/platform-wallet/withdraw', data);
    return response.data;
  },

  // Transfer fees between chains (admin only)
  transferFees: async (data: TransferFeesData): Promise<ApiResponse> => {
    const response = await apiClient.post('/platform-wallet/transfer', data);
    return response.data;
  },
};