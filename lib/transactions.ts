/**
 * Transactions API - STUBBED OUT
 * This file has been stubbed out for dummy frontend mode.
 * All transaction functions return mock data.
 */

import { generateMockTransactions, createMockResponse, simulateDelay } from './mock-data';
import { TransactionHistoryFilters, TransactionHistoryResponse } from '../types/transaction-types';

export const transactionAPI = {
  getHistory: async (filters: TransactionHistoryFilters = {}): Promise<TransactionHistoryResponse> => {
    await simulateDelay(500);
    const transactions = generateMockTransactions(filters.limit || 20);
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    return {
      success: true,
      message: 'Transaction history loaded',
      data: {
        transactions,
        summary: {
          total: transactions.length,
          page: page,
          limit: limit,
          pages: Math.ceil(transactions.length / limit),
          hasNext: page < Math.ceil(transactions.length / limit),
          hasPrev: page > 1,
        },
      },
    };
  },
  getTransaction: async (id: string): Promise<any> => {
    await simulateDelay(300);
    const tx = generateMockTransactions(1)[0];
    return createMockResponse({ ...tx, id }, 'Transaction loaded');
  },
};
