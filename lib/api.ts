/**
 * API Client - STUBBED OUT
 * This file has been stubbed out for dummy frontend mode.
 * All API calls are replaced with mock implementations.
 */

import { createMockResponse, simulateDelay } from './mock-data';

// Stub axios instance
const apiClient = {
  get: async (url: string) => {
    await simulateDelay(300);
    return { data: createMockResponse({}, 'Mock GET response') };
  },
  post: async (url: string, data?: any) => {
    await simulateDelay(300);
    return { data: createMockResponse({}, 'Mock POST response') };
  },
  put: async (url: string, data?: any) => {
    await simulateDelay(300);
    return { data: createMockResponse({}, 'Mock PUT response') };
  },
  delete: async (url: string) => {
    await simulateDelay(300);
    return { data: createMockResponse({}, 'Mock DELETE response') };
  },
  interceptors: {
    request: { use: () => {} },
    response: { use: () => {} },
  },
  defaults: {
    baseURL: '',
    headers: {},
  },
};

export const authUtils = {
  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('dotpay_token');
  },
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('dotpay_token');
  },
  clearAuth: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('dotpay_token');
    localStorage.removeItem('dotpay_user');
  },
  setAuth: (token: string, userData?: any): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('dotpay_token', token);
    if (userData) {
      localStorage.setItem('dotpay_user', JSON.stringify(userData));
    }
  },
  isValidToken: (token: string): boolean => {
    return !!token && token.length > 10;
  },
  ensureAuthenticated: async (): Promise<boolean> => {
    return authUtils.isAuthenticated();
  },
};

export default apiClient;
export { apiClient as api };
