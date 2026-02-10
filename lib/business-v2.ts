/**
 * Business V2 API - STUBBED OUT
 * This file has been stubbed out for dummy frontend mode.
 * All business functions return mock data.
 */

import { generateMockBusinessAccounts, createMockResponse, simulateDelay, MockBusinessAccount } from './mock-data';

export type BusinessAccount = MockBusinessAccount;
export type BusinessV2OtpRequest = { phoneNumber: string };
export type BusinessV2CreateRequest = { userId: string; businessName: string; ownerName: string; phoneNumber: string; location: string; businessType: string };
export type BusinessV2CompleteRequest = { userId: string; businessName: string; ownerName: string; phoneNumber: string; location: string; businessType: string; otp: string };
export type ApiEnvelope<T = any> = { success: boolean; message: string; data: T | null; error?: { code?: string; message?: string } | null; timestamp?: string };

export const businessV2API = {
  requestOtp: async (data: BusinessV2OtpRequest): Promise<ApiEnvelope> => {
    await simulateDelay(500);
    return { success: true, message: 'OTP sent', data: null };
  },
  createBusiness: async (data: BusinessV2CreateRequest): Promise<ApiEnvelope> => {
    await simulateDelay(500);
    return { success: true, message: 'Business creation initiated', data: null };
  },
  completeBusiness: async (data: BusinessV2CompleteRequest): Promise<ApiEnvelope<BusinessAccount>> => {
    await simulateDelay(800);
    const businesses = generateMockBusinessAccounts();
    return { success: true, message: 'Business created', data: businesses[0] };
  },
  getUserBusinesses: async (): Promise<ApiEnvelope<{ businesses: BusinessAccount[] }>> => {
    await simulateDelay(500);
    return { success: true, message: 'Businesses loaded', data: { businesses: generateMockBusinessAccounts() } };
  },
  getBusiness: async (businessId: string): Promise<ApiEnvelope<BusinessAccount>> => {
    await simulateDelay(300);
    const businesses = generateMockBusinessAccounts();
    return { success: true, message: 'Business loaded', data: businesses[0] };
  },
};
