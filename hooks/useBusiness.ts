import { useState, useCallback } from 'react';
import { useApi } from './useApi';

// Business API interfaces
export interface BusinessData {
  businessId: string;
  businessName: string;
  ownerName: string;
  location: string;
  businessType: string;
  phoneNumber: string;
  merchantId: string;
  walletAddress: string;
  creditLimit: number;
  availableCredit: number;
  currentCredit: number;
  creditScore: number;
  riskLevel: string;
  overdraftEnabled: boolean;
  totalVolume: number;
  monthlyVolume: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreditAssessment {
  creditScore: number;
  riskLevel: string;
  creditLimit: number;
  availableCredit: number;
  currentCredit: number;
  totalVolume: number;
  monthlyVolume: number;
  paymentSuccessRate: number;
  recommendations: string[];
}

export interface OverdraftRequest {
  businessId: string;
  amount: number;
  purpose: string;
}

export interface OverdraftRepayment {
  businessId: string;
  amount: number;
}

export const useBusiness = () => {
  const businessDetailsApi = useApi();
  const businessStatusApi = useApi();
  const businessCreateApi = useApi();
  const businessCompleteApi = useApi();
  const overdraftRequestApi = useApi();
  const overdraftRepayApi = useApi();
  const overdraftAssessmentApi = useApi();
  const overdraftToggleApi = useApi();
  const overdraftHistoryApi = useApi();

  // Get business details
  const getBusinessDetails = useCallback(async () => {
    return businessDetailsApi.execute(
      async () => {
        const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.dotpay.xyz' : 'http://localhost:8000'}/api/business/details`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('dotpay_token')}`,
            'Content-Type': 'application/json',
          },
        });
        return response.json();
      },
      {
        showSuccessToast: false,
      }
    );
  }, [businessDetailsApi]);

  // Check business status
  const getBusinessStatus = useCallback(async () => {
    return businessStatusApi.execute(
      async () => {
        const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.dotpay.xyz' : 'http://localhost:8000'}/api/business/status`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('dotpay_token')}`,
            'Content-Type': 'application/json',
          },
        });
        return response.json();
      },
      {
        showSuccessToast: false,
      }
    );
  }, [businessStatusApi]);

  // Request business creation
  const requestBusinessCreation = useCallback(async (data: {
    userId: string;
    phoneNumber: string;
    businessName: string;
    ownerName: string;
    location: string;
    businessType: string;
  }) => {
    return businessCreateApi.execute(
      async () => {
        const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.dotpay.xyz' : 'http://localhost:8000'}/api/business/request-upgrade`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('dotpay_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        return response.json();
      },
      {
        showSuccessToast: true,
        successMessage: 'Business creation request sent successfully!',
      }
    );
  }, [businessCreateApi]);

  // Complete business creation
  const completeBusinessCreation = useCallback(async (data: {
    userId: string;
    phoneNumber: string;
    otp: string;
    businessName: string;
    ownerName: string;
    location: string;
    businessType: string;
  }) => {
    return businessCompleteApi.execute(
      async () => {
        const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.dotpay.xyz' : 'http://localhost:8000'}/api/business/complete-upgrade`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('dotpay_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        return response.json();
      },
      {
        showSuccessToast: true,
        successMessage: 'Business account created successfully!',
      }
    );
  }, [businessCompleteApi]);

  // Request overdraft
  const requestOverdraft = useCallback(async (data: OverdraftRequest) => {
    return overdraftRequestApi.execute(
      async () => {
        const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.dotpay.xyz' : 'http://localhost:8000'}/api/business/overdraft/request`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('dotpay_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        return response.json();
      },
      {
        showSuccessToast: true,
        successMessage: 'Overdraft request successful!',
      }
    );
  }, [overdraftRequestApi]);

  // Repay overdraft
  const repayOverdraft = useCallback(async (data: OverdraftRepayment) => {
    return overdraftRepayApi.execute(
      async () => {
        const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.dotpay.xyz' : 'http://localhost:8000'}/api/business/overdraft/repay`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('dotpay_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        return response.json();
      },
      {
        showSuccessToast: true,
        successMessage: 'Overdraft repayment successful!',
      }
    );
  }, [overdraftRepayApi]);

  // Get credit assessment
  const getCreditAssessment = useCallback(async (businessId: string) => {
    return overdraftAssessmentApi.execute(
      async () => {
        const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.dotpay.xyz' : 'http://localhost:8000'}/api/business/overdraft/assessment/${businessId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('dotpay_token')}`,
            'Content-Type': 'application/json',
          },
        });
        return response.json();
      },
      {
        showSuccessToast: false,
      }
    );
  }, [overdraftAssessmentApi]);

  // Toggle overdraft facility
  const toggleOverdraft = useCallback(async (data: { businessId: string; enabled: boolean }) => {
    return overdraftToggleApi.execute(
      async () => {
        const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.dotpay.xyz' : 'http://localhost:8000'}/api/business/overdraft/toggle`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('dotpay_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        return response.json();
      },
      {
        showSuccessToast: true,
        successMessage: `Overdraft facility ${data.enabled ? 'enabled' : 'disabled'} successfully!`,
      }
    );
  }, [overdraftToggleApi]);

  // Get overdraft history
  const getOverdraftHistory = useCallback(async (businessId: string) => {
    return overdraftHistoryApi.execute(
      async () => {
        const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.dotpay.xyz' : 'http://localhost:8000'}/api/business/overdraft/history/${businessId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('dotpay_token')}`,
            'Content-Type': 'application/json',
          },
        });
        return response.json();
      },
      {
        showSuccessToast: false,
      }
    );
  }, [overdraftHistoryApi]);

  return {
    // Business details
    getBusinessDetails,
    getBusinessStatus,
    businessDetailsLoading: businessDetailsApi.loading,
    businessDetailsError: businessDetailsApi.error,
    businessStatusLoading: businessStatusApi.loading,
    businessStatusError: businessStatusApi.error,

    // Business creation
    requestBusinessCreation,
    completeBusinessCreation,
    businessCreateLoading: businessCreateApi.loading,
    businessCreateError: businessCreateApi.error,
    businessCompleteLoading: businessCompleteApi.loading,
    businessCompleteError: businessCompleteApi.error,

    // Overdraft operations
    requestOverdraft,
    repayOverdraft,
    getCreditAssessment,
    toggleOverdraft,
    getOverdraftHistory,
    overdraftRequestLoading: overdraftRequestApi.loading,
    overdraftRequestError: overdraftRequestApi.error,
    overdraftRepayLoading: overdraftRepayApi.loading,
    overdraftRepayError: overdraftRepayApi.error,
    overdraftAssessmentLoading: overdraftAssessmentApi.loading,
    overdraftAssessmentError: overdraftAssessmentApi.error,
    overdraftToggleLoading: overdraftToggleApi.loading,
    overdraftToggleError: overdraftToggleApi.error,
    overdraftHistoryLoading: overdraftHistoryApi.loading,
    overdraftHistoryError: overdraftHistoryApi.error,
  };
};
