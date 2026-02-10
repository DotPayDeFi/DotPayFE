/**
 * Earn V2 API - STUBBED OUT
 * This file has been stubbed out for dummy frontend mode.
 */

import { createMockResponse, simulateDelay } from './mock-data';
import { ApiEnvelope } from './business-v2';

export type EarnDepositRequest = { businessId: string; amount: string; asset: string };
export type EarnWithdrawRequest = { businessId: string; amount: string; asset: string };

export const earnV2API = {
  deposit: async (payload: EarnDepositRequest): Promise<ApiEnvelope<{ sharesMinted: string; poolBalance: string }>> => {
    await simulateDelay(1000);
    return {
      success: true,
      message: 'Deposit successful',
      data: {
        sharesMinted: payload.amount,
        poolBalance: '1000000.00',
      },
    };
  },
  withdraw: async (payload: EarnWithdrawRequest): Promise<ApiEnvelope<{ amountReceived: string; poolBalance: string }>> => {
    await simulateDelay(1000);
    return {
      success: true,
      message: 'Withdrawal successful',
      data: {
        amountReceived: payload.amount,
        poolBalance: '900000.00',
      },
    };
  },
};
