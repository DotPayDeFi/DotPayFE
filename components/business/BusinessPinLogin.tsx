"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useBusiness } from '@/context/BusinessContext';
import { Shield, Eye, EyeOff } from 'lucide-react';

interface BusinessPinLoginProps {
  onSuccess?: () => void;
  className?: string;
}

export const BusinessPinLogin: React.FC<BusinessPinLoginProps> = ({
  onSuccess,
  className = ""
}) => {
  const router = useRouter();
  const { businessAccounts, switchToBusiness, loadBusinessAccounts, verifyBusinessPin } = useBusiness();
  const { toast } = useToast();

  // Load businesses when component mounts
  React.useEffect(() => {
    if (businessAccounts.length === 0) {
      console.log('BusinessPinLogin: Loading businesses on mount');
      loadBusinessAccounts();
    }
  }, [businessAccounts.length, loadBusinessAccounts]);
  
  const [businessId, setBusinessId] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePinInput = (value: string) => {
    // Only allow 6 digits
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length <= 6) {
      setPin(digitsOnly);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!businessId) {
      toast({
        title: "Business Required",
        description: "Please select a business account",
        variant: "destructive",
      });
      return;
    }

    if (pin.length !== 6) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be 6 digits",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Verifying PIN for businessId:', businessId);
      const response = await verifyBusinessPin(businessId, pin);
      console.log('PIN verification response:', response);
      
      if (response) {
        toast({
          title: "PIN Verified",
          description: "Redirecting to your business dashboard...",
        });
        
        // Switch to the business account
        console.log('Switching to business account:', businessId);
        await switchToBusiness(businessId);
        
        // Reset form
        setBusinessId('');
        setPin('');
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
        
        // Use Next.js router for proper navigation
        console.log('Redirecting to /business/home');
        router.push('/business/home');
      } else {
        console.log('PIN verification failed:', response);
        toast({
          title: "Invalid PIN",
          description: "Please check your PIN and try again",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || "Could not verify PIN";
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-[#0795B0]/20 rounded-full">
            <Shield className="h-8 w-8 text-[#0795B0]" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Business PIN Login</h2>
        <p className="text-gray-300">Enter your business PIN to access your account</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Business Selection */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Select Business Account
          </label>
          <select
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            className="w-full p-3 border border-[#0795B0] rounded-lg bg-transparent text-white focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent"
            required
          >
            <option value="" className="bg-[#0A0E0E] text-white">
              Choose a business account...
            </option>
            {businessAccounts.map((business) => (
              <option 
                key={business.businessId} 
                value={business.businessId}
                className="bg-[#0A0E0E] text-white"
              >
                {business.businessName} ({business.merchantId})
              </option>
            ))}
          </select>
        </div>

        {/* PIN Input */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Business PIN
          </label>
          <div className="relative">
            <input
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={(e) => handlePinInput(e.target.value)}
              placeholder="Enter 6-digit PIN"
              maxLength={6}
              className="w-full p-3 border border-[#0795B0] rounded-lg bg-transparent text-white text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading || !businessId || pin.length !== 6}
          className="w-full bg-[#0795B0] hover:bg-[#0684A0] text-white font-bold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Verifying..." : "Access Business Account"}
        </Button>
      </form>

      {/* Info Text */}
      <div className="text-center text-sm text-gray-400">
        <p>Need to create a business account? Contact support.</p>
      </div>
    </div>
  );
};
