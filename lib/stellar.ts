/**
 * Stellar API - STUBBED OUT
 * This file has been stubbed out for dummy frontend mode.
 * All Stellar functions return mock data.
 */

import { generateMockStellarWallet, createMockResponse, simulateDelay } from './mock-data';

export type StellarBalance = { asset: string; balance: string; usdValue: number };
export type StellarWalletResponse = { success: boolean; message?: string; data: { accountId: string; balances: StellarBalance[]; sequence: string; isActive: boolean; createdAt?: string } };
export type StellarSecretKeyResponse = { success: boolean; message?: string; data: { accountId: string; secretKey: string; warning: string } };
export type StellarSendPaymentData = { toAccountId: string; amount: string; asset: 'XLM' | 'USDC'; memo?: string };
export type StellarSendPaymentResponse = { success: boolean; message?: string; data: { transactionHash: string; transactionId: string; amount: string; asset: string; recipient: string } };

export const stellarWalletAPI = {
  getWallet: async (): Promise<StellarWalletResponse> => {
    await simulateDelay(500);
    const wallet = generateMockStellarWallet();
    return {
      success: true,
      data: {
        accountId: wallet.accountId,
        balances: wallet.balances.map(b => ({ asset: b.asset, balance: b.balance, usdValue: parseFloat(b.usdValue) })),
        sequence: '0',
        isActive: wallet.isActive,
        createdAt: new Date().toISOString(),
      },
    };
  },
  createWallet: async (): Promise<StellarWalletResponse> => {
    await simulateDelay(800);
    const wallet = generateMockStellarWallet();
    return {
      success: true,
      data: {
        accountId: wallet.accountId,
        balances: wallet.balances.map(b => ({ asset: b.asset, balance: b.balance, usdValue: parseFloat(b.usdValue) })),
        sequence: '0',
        isActive: wallet.isActive,
        createdAt: new Date().toISOString(),
      },
    };
  },
  getSecretKey: async (): Promise<StellarSecretKeyResponse> => {
    await simulateDelay(500);
    return {
      success: true,
      data: {
        accountId: 'G' + Array.from({ length: 56 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]).join(''),
        secretKey: 'S' + Array.from({ length: 56 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]).join(''),
        warning: 'Keep this secret key secure and never share it',
      },
    };
  },
  sendPayment: async (data: StellarSendPaymentData): Promise<StellarSendPaymentResponse> => {
    await simulateDelay(1000);
    return {
      success: true,
      data: {
        transactionHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        transactionId: `tx_${Date.now()}`,
        amount: data.amount,
        asset: data.asset,
        recipient: data.toAccountId,
      },
    };
  },
  getTransactionHistory: async (): Promise<any> => {
    await simulateDelay(500);
    return createMockResponse([], 'Transaction history loaded');
  },
};
