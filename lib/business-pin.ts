/**
 * Business PIN API - STUBBED OUT
 * This file has been stubbed out for dummy frontend mode.
 * All business PIN functions return mock data.
 */

import { createMockResponse, simulateDelay } from './mock-data';

export type BusinessPinSetData = { merchantId: string; phoneNumber: string; otp: string; pin: string };
export type BusinessPinSetPublicData = { merchantId?: string; phoneNumber?: string; otp: string; pin: string };
export type BusinessPinRequestOtpData = { merchantId: string; phoneNumber: string };
export type BusinessPinUpdateData = { businessId: string; oldPin: string; newPin: string };
export type BusinessPinVerifyData = { businessId: string; pin: string };
export type BusinessPinVerifyTransactionData = { businessId: string; pin: string; transactionType: string; amount?: number };
export type BusinessPinForgotRequestData = { merchantId?: string; phoneNumber?: string };
export type BusinessPinForgotConfirmData = { merchantId?: string; phoneNumber?: string; otp: string; newPin: string };

export const businessPinAPI = {
  setPin: async (data: BusinessPinSetData): Promise<any> => {
    await simulateDelay(800);
    return createMockResponse({}, 'PIN set successfully');
  },
  requestOtp: async (data: BusinessPinRequestOtpData): Promise<any> => {
    await simulateDelay(500);
    return createMockResponse({}, 'OTP sent');
  },
  updatePin: async (data: BusinessPinUpdateData): Promise<any> => {
    await simulateDelay(800);
    return createMockResponse({}, 'PIN updated');
  },
  verifyPin: async (data: BusinessPinVerifyData): Promise<any> => {
    await simulateDelay(500);
    return createMockResponse({ verified: true, verifiedAt: new Date().toISOString() }, 'PIN verified');
  },
  verifyTransactionPin: async (data: BusinessPinVerifyTransactionData): Promise<any> => {
    await simulateDelay(500);
    return createMockResponse({ verified: true }, 'Transaction PIN verified');
  },
  forgotPinRequest: async (data: BusinessPinForgotRequestData): Promise<any> => {
    await simulateDelay(500);
    return createMockResponse({}, 'OTP sent for PIN reset');
  },
  forgotPinConfirm: async (data: BusinessPinForgotConfirmData): Promise<any> => {
    await simulateDelay(800);
    return createMockResponse({}, 'PIN reset successful');
  },
};
