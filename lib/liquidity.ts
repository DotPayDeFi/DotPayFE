/**
 * Liquidity API - STUBBED OUT
 * This file has been stubbed out for dummy frontend mode.
 * All liquidity functions return mock data.
 */

import { createMockResponse, simulateDelay } from './mock-data';
import { ApiResponse } from './wallet';

export type ProvideLiquidityData = { token: string; amount: string; chain: string; lockPeriod?: number };
export type LiquidityPosition = { id: string; token: string; amount: string; chain: string; apy: string; lockPeriod: number; unlockDate: string; rewards: string; status: 'active' | 'unlocking' | 'withdrawn'; createdAt: string };
export type LiquidityStats = { token: string; chain: string; totalLiquidity: string; currentApy: string; totalRewards: string; participantCount: number; averageLockPeriod: number };
export type InitiateWithdrawalData = { positionId: string; amount?: string };
export type ConfirmWithdrawalData = { withdrawalId: string; signature: string };

export const liquidityAPI = {
  provideLiquidity: async (data: ProvideLiquidityData): Promise<ApiResponse> => {
    await simulateDelay(1000);
    return createMockResponse({ positionId: `pos_${Date.now()}` }, 'Liquidity provided');
  },
  getPositions: async (): Promise<ApiResponse<LiquidityPosition[]>> => {
    await simulateDelay(500);
    return createMockResponse([{
      id: 'pos_1',
      token: 'USDC',
      amount: '1000.00',
      chain: 'arbitrum',
      apy: '5.5',
      lockPeriod: 30,
      unlockDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      rewards: '50.00',
      status: 'active',
      createdAt: new Date().toISOString(),
    }]);
  },
  getStats: async (token: string, chain: string): Promise<ApiResponse<LiquidityStats>> => {
    await simulateDelay(300);
    return createMockResponse({
      token,
      chain,
      totalLiquidity: '100000.00',
      currentApy: '5.5',
      totalRewards: '5000.00',
      participantCount: 100,
      averageLockPeriod: 30,
    });
  },
  initiateWithdrawal: async (data: InitiateWithdrawalData): Promise<ApiResponse> => {
    await simulateDelay(500);
    return createMockResponse({ withdrawalId: `wd_${Date.now()}` }, 'Withdrawal initiated');
  },
  confirmWithdrawal: async (data: ConfirmWithdrawalData): Promise<ApiResponse> => {
    await simulateDelay(1000);
    return createMockResponse({}, 'Withdrawal confirmed');
  },
};
