/**
 * Business Finance API - STUBBED OUT
 * This file has been stubbed out for dummy frontend mode.
 */

import { createMockResponse, simulateDelay } from './mock-data';

export type TokenBalance = { balance: number; usdValue: number; kesValue: number; price: number; contractAddress?: string };
export type ChainBalances = { USDC: TokenBalance; USDT: TokenBalance; [key: string]: TokenBalance | undefined };
export type BusinessBalanceOverview = { totalUSDValue: number; totalKESValue: number; activeChains: string[]; totalTokens: Record<string, number>; lastUpdated: string };

export const businessFinanceAPI = {
  getBalanceOverview: async (businessId: string): Promise<any> => {
    await simulateDelay(500);
    return createMockResponse({
      totalUSDValue: 10000,
      totalKESValue: 1500000,
      activeChains: ['arbitrum', 'celo'],
      totalTokens: { USDC: 10000 },
      lastUpdated: new Date().toISOString(),
    });
  },
  getChainBalances: async (businessId: string, chain: string): Promise<any> => {
    await simulateDelay(300);
    return createMockResponse({
      USDC: { balance: 10000, usdValue: 10000, kesValue: 1500000, price: 1.0 },
      USDT: { balance: 5000, usdValue: 5000, kesValue: 750000, price: 1.0 },
    });
  },
};
