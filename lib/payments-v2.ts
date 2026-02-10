/**
 * Payments V2 API - STUBBED OUT
 * This file has been stubbed out for dummy frontend mode.
 */

import { createMockResponse, simulateDelay } from './mock-data';
import { ApiEnvelope } from './business-v2';

export type ChargeMerchantRequest = { merchantId: string; amount: string; asset: string; chain: string };
export type ChargeWalletRequest = { walletAddress: string; amount: string; asset: string; chain: string };

export const paymentsV2API = {
  chargeMerchant: async (payload: ChargeMerchantRequest): Promise<ApiEnvelope<{ transactionHash: string; explorerUrl: string; amount: string; asset: string }>> => {
    await simulateDelay(1000);
    return {
      success: true,
      message: 'Charge successful',
      data: {
        transactionHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        explorerUrl: '#',
        amount: payload.amount,
        asset: payload.asset,
      },
    };
  },
  chargeWallet: async (payload: ChargeWalletRequest): Promise<ApiEnvelope<{ transactionHash: string; explorerUrl: string; amount: string; asset: string }>> => {
    await simulateDelay(1000);
    return {
      success: true,
      message: 'Charge successful',
      data: {
        transactionHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        explorerUrl: '#',
        amount: payload.amount,
        asset: payload.asset,
      },
    };
  },
};
