/**
 * Wallet API - STUBBED OUT
 * This file has been stubbed out for dummy frontend mode.
 * All wallet functions return mock data.
 */

import { generateMockWallet, generateMockBalance, createMockResponse, simulateDelay, MockWalletDetails, MockBalanceData } from './mock-data';

// Re-export types
export type WalletDetails = MockWalletDetails;
export type BalanceData = MockBalanceData;
export type SupportedChain = { name: string; id: string; chainId: number };
export type ReceiveData = { walletAddress: string; phoneNumber: string; email: string; supportedChains: SupportedChain[]; note: string };
export type SendTokenData = { to: string; amount: string; token: string; chain: string };
export type PayMerchantData = { merchantId: string; amount: string; token: string; chain: string; description?: string };
export type TransferEvent = { id: string; from: string; to: string; amount: string; token: string; chain: string; txHash: string; timestamp: string; status: 'pending' | 'confirmed' | 'failed'; type: 'send' | 'receive' | 'payment' };
export type UnifyWalletData = { sourceChain: string; targetChain: string; tokens: string[] };
export type MigrateWalletData = { fromChain: string; toChain: string; tokens: string[] };
export type ApiResponse<T = any> = { success: boolean; message: string; data: T; timestamp?: string };

export const walletAPI = {
  getReceiveInfo: async (): Promise<ApiResponse<ReceiveData>> => {
    await simulateDelay(500);
    const wallet = generateMockWallet();
    return createMockResponse({
      walletAddress: wallet.walletAddress,
      phoneNumber: wallet.phoneNumber,
      email: wallet.email,
      supportedChains: wallet.supportedChains,
      note: wallet.note,
    });
  },
  getBalance: async (): Promise<ApiResponse<BalanceData>> => {
    await simulateDelay(500);
    return createMockResponse(generateMockBalance());
  },
  getWallet: async (): Promise<ApiResponse<WalletDetails>> => {
    await simulateDelay(500);
    return createMockResponse(generateMockWallet());
  },
  sendToken: async (data: SendTokenData): Promise<ApiResponse> => {
    await simulateDelay(1000);
    return createMockResponse({
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      status: 'pending',
    }, 'Token sent successfully');
  },
  payMerchant: async (data: PayMerchantData): Promise<ApiResponse> => {
    await simulateDelay(1000);
    return createMockResponse({
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      status: 'pending',
    }, 'Payment sent successfully');
  },
  getTransferEvents: async (): Promise<ApiResponse<TransferEvent[]>> => {
    await simulateDelay(500);
    return createMockResponse([]);
  },
  unifyWallet: async (data: UnifyWalletData): Promise<ApiResponse> => {
    await simulateDelay(1000);
    return createMockResponse({}, 'Wallet unified');
  },
  migrateWallet: async (data: MigrateWalletData): Promise<ApiResponse> => {
    await simulateDelay(1000);
    return createMockResponse({}, 'Wallet migrated');
  },
};
