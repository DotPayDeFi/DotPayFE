"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuthSession } from './AuthSessionContext';
import { generateMockBusinessAccounts, createMockResponse, simulateDelay, MockBusinessAccount } from '@/lib/mock-data';

// Re-export type for compatibility
export type BusinessAccount = MockBusinessAccount;

export interface BusinessPinSession {
  verified: boolean;
  verifiedAt: string;
  expiresAt: string;
  businessId: string;
  businessName: string;
  merchantId: string;
}

interface BusinessContextType {
  // Business accounts
  businessAccounts: BusinessAccount[];
  currentBusiness: BusinessAccount | null;
  isLoadingBusinesses: boolean;
  
  // PIN verification
  pinSession: BusinessPinSession | null;
  isPinVerified: boolean;
  
  // Actions
  loadBusinessAccounts: () => Promise<void>;
  switchToBusiness: (businessId: string) => Promise<void>;
  switchToPersonal: () => void;
  verifyBusinessPin: (businessId: string, pin: string) => Promise<boolean>;
  setBusinessPin: (businessId: string, pin: string) => Promise<boolean>;
  requestPinSetupOtp: (businessId: string) => Promise<boolean>;
  setBusinessPinWithOtp: (businessId: string, otp: string, pin: string) => Promise<boolean>;
  updateBusinessPin: (businessId: string, oldPin: string, newPin: string) => Promise<boolean>;
  forgotBusinessPin: (merchantId: string, phoneNumber: string, otp: string, newPin: string) => Promise<boolean>;
  requestPinResetOtp: (merchantId?: string, phoneNumber?: string) => Promise<boolean>;
  
  // PIN session management
  clearPinSession: () => void;
  checkPinSessionExpiry: () => boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};

interface BusinessProviderProps {
  children: ReactNode;
}

export const BusinessProvider: React.FC<BusinessProviderProps> = ({ children }) => {
  const { isLoggedIn } = useAuthSession();
  const [businessAccounts, setBusinessAccounts] = useState<BusinessAccount[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<BusinessAccount | null>(null);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(false);
  const [pinSession, setPinSession] = useState<BusinessPinSession | null>(null);

  // Check if PIN session is still valid
  const checkPinSessionExpiry = (): boolean => {
    if (!pinSession) return false;
    
    const expiresAt = new Date(pinSession.expiresAt);
    return new Date() < expiresAt;
  };

  const isPinVerified = pinSession ? checkPinSessionExpiry() : false;

  // Load user's business accounts (mocked, keyed only by auth state)
  const loadBusinessAccounts = async (): Promise<void> => {
    if (!isLoggedIn) {
      return;
    }

    setIsLoadingBusinesses(true);
    try {
      await simulateDelay(600);
      const mockBusinesses = generateMockBusinessAccounts();
      setBusinessAccounts(mockBusinesses);
    } catch (error) {
      console.error('Failed to load business accounts:', error);
      setBusinessAccounts([]);
    } finally {
      setIsLoadingBusinesses(false);
    }
  };

  // Switch to business account
  const switchToBusiness = async (businessId: string): Promise<void> => {
    const business = businessAccounts.find(b => b.businessId === businessId);
    if (!business) {
      console.error('Business account not found for ID:', businessId);
      throw new Error('Business account not found');
    }
    
    setCurrentBusiness(business);
  };

  // Switch to personal account
  const switchToPersonal = (): void => {
    setCurrentBusiness(null);
    setPinSession(null);
  };

  // Verify business PIN
  const verifyBusinessPin = async (businessId: string, pin: string): Promise<boolean> => {
    try {
      await simulateDelay(800);
      
      // Mock PIN verification (accept any 4-6 digit PIN)
      if (pin && pin.length >= 4 && pin.length <= 6) {
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        const business = businessAccounts.find(b => b.businessId === businessId);
        
        const newPinSession = {
          verified: true,
          verifiedAt: new Date().toISOString(),
          expiresAt: expiresAt,
          businessId: businessId,
          businessName: business?.businessName || '',
          merchantId: business?.merchantId || '',
        };
        
        setPinSession(newPinSession);
        if (business) {
          setCurrentBusiness(business);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to verify business PIN:', error);
      return false;
    }
  };

  // Request OTP for PIN setting
  const requestPinSetupOtp = async (businessId: string): Promise<boolean> => {
    try {
      await simulateDelay(500);
      return true;
    } catch (error: any) {
      console.error('Failed to request PIN setup OTP:', error);
      return false;
    }
  };

  // Set business PIN with OTP
  const setBusinessPinWithOtp = async (businessId: string, otp: string, pin: string): Promise<boolean> => {
    try {
      await simulateDelay(800);
      // Mock: accept any OTP and PIN
      return true;
    } catch (error: any) {
      console.error('Failed to set business PIN with OTP:', error);
      return false;
    }
  };

  // Legacy method for backward compatibility
  const setBusinessPin = async (businessId: string, pin: string): Promise<boolean> => {
    console.warn('setBusinessPin called - this now requires OTP flow');
    return false;
  };

  // Update business PIN
  const updateBusinessPin = async (businessId: string, oldPin: string, newPin: string): Promise<boolean> => {
    try {
      await simulateDelay(800);
      return true;
    } catch (error) {
      console.error('Failed to update business PIN:', error);
      return false;
    }
  };

  // Request PIN reset OTP
  const requestPinResetOtp = async (merchantId?: string, phoneNumber?: string): Promise<boolean> => {
    try {
      await simulateDelay(500);
      return true;
    } catch (error) {
      console.error('Failed to request PIN reset OTP:', error);
      return false;
    }
  };

  // Forgot business PIN (confirm with OTP)
  const forgotBusinessPin = async (merchantId: string, phoneNumber: string, otp: string, newPin: string): Promise<boolean> => {
    try {
      await simulateDelay(800);
      return true;
    } catch (error) {
      console.error('Failed to reset business PIN:', error);
      return false;
    }
  };

  // Clear PIN session
  const clearPinSession = (): void => {
    setPinSession(null);
  };

  // Load business accounts when user changes
  useEffect(() => {
    if (isLoggedIn) {
      loadBusinessAccounts();
    } else {
      setBusinessAccounts([]);
      setCurrentBusiness(null);
      setPinSession(null);
    }
  }, [isLoggedIn]);

  // Also load businesses when the component mounts and user is already authenticated
  useEffect(() => {
    if (isLoggedIn && businessAccounts.length === 0 && !isLoadingBusinesses) {
      loadBusinessAccounts();
    }
  }, [isLoggedIn, businessAccounts.length, isLoadingBusinesses]);

  // Check PIN session expiry periodically
  useEffect(() => {
    if (pinSession) {
      const interval = setInterval(() => {
        if (!checkPinSessionExpiry()) {
          setPinSession(null);
        }
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [pinSession]);

  const value: BusinessContextType = {
    businessAccounts,
    currentBusiness,
    isLoadingBusinesses,
    pinSession,
    isPinVerified,
    loadBusinessAccounts,
    switchToBusiness,
    switchToPersonal,
    verifyBusinessPin,
    setBusinessPin,
    requestPinSetupOtp,
    setBusinessPinWithOtp,
    updateBusinessPin,
    forgotBusinessPin,
    requestPinResetOtp,
    clearPinSession,
    checkPinSessionExpiry,
  };

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
};
