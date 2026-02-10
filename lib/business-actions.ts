import apiClient from './api';

// Types for Business Actions API
export interface BusinessDetails {
  businessId: string;
  businessName: string;
  merchantId: string;
  walletAddress: string;
  creditLimit: number;
  availableCredit: number;
  overdraftEnabled: boolean;
  isVerified: boolean;
  pinSet: boolean;
  createdAt: string;
}

export interface BusinessStatus {
  status: string;
  isVerified: boolean;
  pinSet: boolean;
  overdraftEnabled: boolean;
  creditLimit: number;
  availableCredit: number;
}

export interface BusinessProfile {
  businessId: string;
  businessName: string;
  merchantId: string;
  walletAddress: string;
  phoneNumber: string;
  businessType: string;
  isVerified: boolean;
  pinSet: boolean;
}

export interface OverdraftRequest {
  businessId: string;
  amount: number;
  purpose: string;
  repaymentPeriod: number;
}

export interface OverdraftRequestResponse {
  requestId: string;
  amount: number;
  status: string;
  estimatedApprovalTime: string;
}

export interface OverdraftRepayment {
  businessId: string;
  amount: number;
  transactionHash: string;
}

export interface OverdraftRepaymentResponse {
  repaymentId: string;
  amount: number;
  remainingBalance: number;
  transactionHash: string;
}

export interface CreditAssessment {
  businessId: string;
  creditScore: number;
  creditLimit: number;
  availableCredit: number;
  currentDebt: number;
  riskLevel: string;
  lastAssessment: string;
  recommendations: string[];
}

export interface OverdraftToggle {
  businessId: string;
  enabled: boolean;
}

export interface OverdraftHistory {
  businessId: string;
  history: OverdraftTransaction[];
  totalBorrowed: number;
  totalRepaid: number;
  currentBalance: number;
}

export interface OverdraftTransaction {
  transactionId: string;
  amount: number;
  type: 'borrow' | 'repay';
  timestamp: string;
  status: string;
  transactionHash: string;
}

export interface ExternalTransferVerification {
  transactionHash: string;
  amount: number;
  tokenType: string;
}

export interface ExternalTransferResponse {
  transactionHash: string;
  amount: number;
  status: string;
}

export interface UnifiedUserProfile {
  userId: string;
  personalAccount: {
    walletAddress: string;
    balance: number;
  };
  businessAccounts: Array<{
    businessId: string;
    businessName: string;
    merchantId: string;
    walletAddress: string;
    balance: number;
  }>;
  totalBalance: number;
  totalBusinesses: number;
}

export interface PhoneBusinesses {
  phoneNumber: string;
  businesses: Array<{
    businessId: string;
    businessName: string;
    merchantId: string;
    businessType: string;
    isVerified: boolean;
    pinSet: boolean;
  }>;
  totalCount: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  error?: any;
  timestamp: string;
}

// Business Actions API functions
export const businessActionsAPI = {
  // 1. Business Management
  getBusinessDetails: async (): Promise<ApiResponse<BusinessDetails>> => {
    const response = await apiClient.get('/business/details');
    return response.data;
  },

  getBusinessStatus: async (): Promise<ApiResponse<BusinessStatus>> => {
    const response = await apiClient.get('/business/status');
    return response.data;
  },

  findBusinessByMerchantId: async (merchantId: string): Promise<ApiResponse<BusinessProfile>> => {
    const response = await apiClient.get(`/business/find/${merchantId}`);
    return response.data;
  },

  verifyExternalTransfer: async (data: ExternalTransferVerification): Promise<ApiResponse<ExternalTransferResponse>> => {
    const response = await apiClient.post('/business/verify-external-transfer', data);
    return response.data;
  },

  // 2. Business Overdraft & Credit Management
  requestOverdraft: async (data: OverdraftRequest): Promise<ApiResponse<OverdraftRequestResponse>> => {
    const response = await apiClient.post('/business/overdraft/request', data);
    return response.data;
  },

  repayOverdraft: async (data: OverdraftRepayment): Promise<ApiResponse<OverdraftRepaymentResponse>> => {
    const response = await apiClient.post('/business/overdraft/repay', data);
    return response.data;
  },

  getCreditAssessment: async (businessId: string): Promise<ApiResponse<CreditAssessment>> => {
    const response = await apiClient.get(`/business/overdraft/assessment/${businessId}`);
    return response.data;
  },

  toggleOverdraft: async (data: OverdraftToggle): Promise<ApiResponse<{ businessId: string; overdraftEnabled: boolean; creditLimit: number }>> => {
    const response = await apiClient.post('/business/overdraft/toggle', data);
    return response.data;
  },

  getOverdraftHistory: async (businessId: string): Promise<ApiResponse<OverdraftHistory>> => {
    const response = await apiClient.get(`/business/overdraft/history/${businessId}`);
    return response.data;
  },

  // 3. User Optimization & Profile Management
  getUnifiedUserProfile: async (userId: string): Promise<ApiResponse<UnifiedUserProfile>> => {
    const response = await apiClient.get(`/business/profile/${userId}`);
    return response.data;
  },

  getBusinessesByPhone: async (phoneNumber: string): Promise<ApiResponse<PhoneBusinesses>> => {
    const response = await apiClient.get(`/business/phone/${phoneNumber}`);
    return response.data;
  },
};

export default businessActionsAPI;
