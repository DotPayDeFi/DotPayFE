/**
 * M-Pesa API - STUBBED OUT
 * This file has been stubbed out for dummy frontend mode.
 * All M-Pesa functions return mock data.
 */

import { createMockResponse, simulateDelay } from './mock-data';
import { ApiResponse } from './wallet';

export type DepositData = { amount: string; phoneNumber: string; token?: string; chain?: string };
export type BuyCryptoData = { amount: number; phoneNumber?: string; phone?: string; chain: string; tokenType?: string; tokenSymbol?: string; currency?: 'KES' | 'USD' };
export type WithdrawData = { amount: string; phoneNumber: string; token?: string; tokenSymbol?: string; chain: string };
export type PayBillData = { businessNumber: string; accountNumber: string; amount: string; token: string; chain: string };
export type PayTillData = { tillNumber: string; amount: string; token: string; chain: string };
export type PayWithCryptoData = { amount: number; cryptoAmount: number; targetType: 'paybill' | 'till'; targetNumber: string; token: string; chain: string };
export type CryptoToMpesaResponse = { transactionId: string; status: string; amount: number; phoneNumber: string };

export const mpesaAPI = {
  deposit: async (data: DepositData): Promise<ApiResponse> => {
    await simulateDelay(1000);
    return createMockResponse({ transactionId: `mpesa_${Date.now()}`, status: 'pending' }, 'Deposit initiated');
  },
  buyCrypto: async (data: BuyCryptoData): Promise<ApiResponse> => {
    await simulateDelay(1000);
    return createMockResponse({ transactionId: `buy_${Date.now()}`, status: 'pending' }, 'Buy order placed');
  },
  withdraw: async (data: WithdrawData): Promise<ApiResponse> => {
    await simulateDelay(1000);
    return createMockResponse({ transactionId: `mpesa_${Date.now()}`, status: 'pending' }, 'Withdrawal initiated');
  },
  payBill: async (data: PayBillData): Promise<ApiResponse> => {
    await simulateDelay(1000);
    return createMockResponse({ transactionId: `bill_${Date.now()}`, status: 'pending' }, 'Bill payment initiated');
  },
  payTill: async (data: PayTillData): Promise<ApiResponse> => {
    await simulateDelay(1000);
    return createMockResponse({ transactionId: `till_${Date.now()}`, status: 'pending' }, 'Till payment initiated');
  },
  payWithCrypto: async (data: PayWithCryptoData): Promise<ApiResponse> => {
    await simulateDelay(1000);
    return createMockResponse({ transactionId: `crypto_${Date.now()}`, status: 'pending' }, 'Payment initiated');
  },
  getExchangeRate: async (token: string, chain: string): Promise<ApiResponse<{ rate: number }>> => {
    await simulateDelay(300);
    return createMockResponse({ rate: 1.0 }, 'Exchange rate loaded');
  },
};
