/**
 * Auth API - STUBBED OUT
 * This file has been stubbed out for dummy frontend mode.
 * All authentication functions return mock data.
 */

import { generateMockUser, createMockResponse, simulateDelay, MockUser } from './mock-data';

// Re-export types
export type User = MockUser;
export type RegisterInitiateData = { email: string; phoneNumber: string; password: string; verifyWith: 'email' | 'phone' | 'both' };
export type RegisterData = { email: string; phoneNumber: string; password: string; firstName?: string; lastName?: string };
export type LoginData = { email?: string; phoneNumber?: string; password: string };
export type VerifyEmailData = { email: string; otp: string };
export type VerifyPhoneData = { phoneNumber: string; otp: string };
export type VerifyLoginData = { email?: string; phoneNumber?: string; otp: string };
export type OTPRequestData = { phoneNumber: string };
export type OTPVerifyData = { phoneNumber: string; otp: string };
export type PasswordResetRequestData = { email: string };
export type PasswordResetData = { email: string; otp: string; newPassword: string };
export type GoogleAuthData = { idToken: string; accessToken?: string };
export type GoogleConfigResponse = { clientId: string; redirectUri: string };
export type AuthResponse = { success: boolean; message: string; data: any };

export const authAPI = {
  registerInitiate: async (data: RegisterInitiateData): Promise<AuthResponse> => {
    await simulateDelay(500);
    return createMockResponse({ registrationId: `reg_${Date.now()}` }, 'Registration initiated');
  },
  register: async (data: RegisterData): Promise<AuthResponse> => {
    await simulateDelay(500);
    return createMockResponse({}, 'Registration successful');
  },
  verifyEmail: async (data: VerifyEmailData): Promise<AuthResponse> => {
    await simulateDelay(500);
    const user = generateMockUser(data.email);
    return createMockResponse({ token: user.token, user }, 'Email verified');
  },
  verifyPhone: async (data: VerifyPhoneData): Promise<AuthResponse> => {
    await simulateDelay(500);
    const user = generateMockUser(undefined, data.phoneNumber);
    return createMockResponse({ token: user.token, user }, 'Phone verified');
  },
  login: async (data: LoginData): Promise<AuthResponse> => {
    await simulateDelay(500);
    return createMockResponse({ verificationMethod: data.email ? 'email' : 'phone' }, 'OTP sent');
  },
  verifyLogin: async (data: VerifyLoginData): Promise<AuthResponse> => {
    await simulateDelay(500);
    const user = generateMockUser(data.email, data.phoneNumber);
    return createMockResponse({ token: user.token, user }, 'Login successful');
  },
  requestOTP: async (data: OTPRequestData): Promise<AuthResponse> => {
    await simulateDelay(500);
    return createMockResponse({}, 'OTP sent');
  },
  verifyOTP: async (data: OTPVerifyData): Promise<AuthResponse> => {
    await simulateDelay(500);
    const user = generateMockUser(undefined, data.phoneNumber);
    return createMockResponse({ token: user.token, user }, 'OTP verified');
  },
  requestPasswordReset: async (data: PasswordResetRequestData): Promise<AuthResponse> => {
    await simulateDelay(500);
    return createMockResponse({}, 'Password reset OTP sent');
  },
  resetPassword: async (data: PasswordResetData): Promise<AuthResponse> => {
    await simulateDelay(500);
    return createMockResponse({}, 'Password reset successful');
  },
  logout: async (): Promise<AuthResponse> => {
    await simulateDelay(300);
    return createMockResponse({}, 'Logged out');
  },
  googleAuth: async (data: GoogleAuthData): Promise<AuthResponse> => {
    await simulateDelay(500);
    const user = generateMockUser('google@example.com');
    return createMockResponse({ token: user.token, user }, 'Google auth successful');
  },
  linkGoogle: async (data: GoogleAuthData): Promise<AuthResponse> => {
    await simulateDelay(500);
    return createMockResponse({}, 'Google account linked');
  },
  getGoogleConfig: async (): Promise<GoogleConfigResponse> => {
    await simulateDelay(300);
    return { clientId: 'mock-client-id', redirectUri: typeof window !== 'undefined' ? window.location.origin : '' };
  },
  getUserProfile: async (): Promise<AuthResponse> => {
    await simulateDelay(300);
    return createMockResponse({}, 'Profile loaded');
  },
  getMe: async (): Promise<AuthResponse> => {
    await simulateDelay(300);
    const user = generateMockUser();
    return createMockResponse({ user }, 'User data loaded');
  },
};

export const tokenUtils = {
  setToken: (token: string) => {
    if (typeof window !== 'undefined') localStorage.setItem('dotpay_token', token);
  },
  getToken: (): string | null => {
    if (typeof window !== 'undefined') return localStorage.getItem('dotpay_token');
    return null;
  },
  removeToken: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('dotpay_token');
  },
  isTokenValid: (): boolean => {
    return !!tokenUtils.getToken();
  },
};

export const userUtils = {
  setUser: (user: User) => {
    if (typeof window !== 'undefined') localStorage.setItem('dotpay_user', JSON.stringify(user));
  },
  getUser: (): User | null => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('dotpay_user');
      return data ? JSON.parse(data) : null;
    }
    return null;
  },
  removeUser: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('dotpay_user');
  },
  isAuthenticated: (): boolean => {
    return tokenUtils.isTokenValid() && userUtils.getUser() !== null;
  },
};
