/**
 * Business API - STUBBED OUT
 * This file has been stubbed out for dummy frontend mode.
 */

import { createMockResponse, simulateDelay } from './mock-data';

export type BusinessUpgradeData = { businessName: string; ownerName: string; location: string; businessType: string; phoneNumber: string };
export type CompleteUpgradeData = { businessId: string; otp: string };
export type TransferFundsData = { businessId: string; amount: string; walletAddress: string };
export type BusinessResponse = { success: boolean; message: string; data: any };
export type BusinessAuthContext = 'business_creation' | 'business_action';

export const businessAPI = {
  requestUpgrade: async (data: BusinessUpgradeData): Promise<BusinessResponse> => {
    await simulateDelay(500);
    return createMockResponse({ businessId: `biz_${Date.now()}` }, 'Upgrade requested');
  },
  completeUpgrade: async (data: CompleteUpgradeData): Promise<BusinessResponse> => {
    await simulateDelay(800);
    return createMockResponse({}, 'Upgrade completed');
  },
  transferFunds: async (data: TransferFundsData): Promise<BusinessResponse> => {
    await simulateDelay(1000);
    return createMockResponse({ txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('') }, 'Funds transferred');
  },
};
