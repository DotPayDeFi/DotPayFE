"use client";

import React, { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Key, Unlock } from 'lucide-react';
import { businessPinAPI } from '@/lib/business-pin';

interface BusinessAccountSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BusinessAccountSwitcher: React.FC<BusinessAccountSwitcherProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const {
    businessAccounts,
    currentBusiness,
    isLoadingBusinesses,
    switchToBusiness,
    switchToPersonal,
    loadBusinessAccounts,
  } = useBusiness();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // PIN management states
  const [showSetPinDialog, setShowSetPinDialog] = useState(false);
  const [showForgotPinDialog, setShowForgotPinDialog] = useState(false);
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [otp, setOtp] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [isPinLoading, setIsPinLoading] = useState(false);

  const handleSwitchToBusiness = async (businessId: string) => {
    const business = businessAccounts.find(b => b.businessId === businessId);
    if (!business) return;

    // If PIN is not set, show message
    if (!business.pinSet) {
      toast({
        title: "PIN Not Set",
        description: "Please set a PIN for this business account first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await switchToBusiness(businessId);
      toast({
        title: "Switched to Business Account",
        description: "You are now using your business account",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Failed to Switch",
        description: "Could not switch to business account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToPersonal = () => {
    switchToPersonal();
    toast({
      title: "Switched to Personal Account",
      description: "You are now using your personal account",
    });
    onClose();
  };

  const handleRefreshBusinesses = async () => {
    setIsLoading(true);
    try {
      await loadBusinessAccounts();
      toast({
        title: "Business Accounts Refreshed",
        description: "Your business accounts have been updated",
      });
    } catch (error) {
      toast({
        title: "Failed to Refresh",
        description: "Could not refresh business accounts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // PIN management functions
  const handlePinInput = (value: string, setter: (value: string) => void) => {
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length <= 6) {
      setter(digitsOnly);
    }
  };

  const resetPinForms = () => {
    setPin('');
    setNewPin('');
    setConfirmPin('');
    setOtp('');
    setMerchantId('');
    setPhoneNumber('');
    setStep('request');
  };

  const handleRequestOtp = async () => {
    if (!merchantId && !phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please provide either Merchant ID or Phone Number",
        variant: "destructive",
      });
      return;
    }

    setIsPinLoading(true);
    try {
      const requestData: any = {};
      if (merchantId) requestData.merchantId = merchantId;
      if (phoneNumber) requestData.phoneNumber = phoneNumber;

      const response = await businessPinAPI.requestOtp(requestData);
      if (response.success) {
        toast({
          title: "OTP Sent",
          description: "Please check your phone for the OTP",
        });
        setStep('confirm');
      } else {
        toast({
          title: "Failed to Send OTP",
          description: response.message || "Could not send OTP",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to Send OTP",
        description: error?.response?.data?.message || "Could not send OTP",
        variant: "destructive",
      });
    } finally {
      setIsPinLoading(false);
    }
  };

  const handleSetPin = async () => {
    if (pin.length !== 6) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be 6 digits",
        variant: "destructive",
      });
      return;
    }

    if (confirmPin !== pin) {
      toast({
        title: "PIN Mismatch",
        description: "PINs do not match",
        variant: "destructive",
      });
      return;
    }

    setIsPinLoading(true);
    try {
      const response = await businessPinAPI.setPinPublic({
        merchantId: merchantId || undefined,
        phoneNumber: phoneNumber || undefined,
        otp,
        pin,
      });
      if (response.success) {
        toast({
          title: "PIN Set Successfully",
          description: "Your business PIN has been set",
        });
        setShowSetPinDialog(false);
        resetPinForms();
      } else {
        toast({
          title: "Failed to Set PIN",
          description: response.message || "Could not set PIN",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to Set PIN",
        description: error?.response?.data?.message || "Could not set PIN",
        variant: "destructive",
      });
    } finally {
      setIsPinLoading(false);
    }
  };

  const handleForgotPinRequest = async () => {
    if (!merchantId && !phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please provide either Merchant ID or Phone Number",
        variant: "destructive",
      });
      return;
    }

    setIsPinLoading(true);
    try {
      const response = await businessPinAPI.forgotPinRequest({ 
        merchantId: merchantId || undefined, 
        phoneNumber: phoneNumber || undefined 
      });
      if (response.success) {
        toast({
          title: "OTP Sent",
          description: "Please check your phone for the OTP",
        });
        setStep('confirm');
      } else {
        toast({
          title: "Failed to Send OTP",
          description: response.message || "Could not send OTP",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to Send OTP",
        description: error?.response?.data?.message || "Could not send OTP",
        variant: "destructive",
      });
    } finally {
      setIsPinLoading(false);
    }
  };

  const handleForgotPinConfirm = async () => {
    if (otp.length !== 6 || newPin.length !== 6) {
      toast({
        title: "Invalid Input",
        description: "OTP and PIN must be 6 digits",
        variant: "destructive",
      });
      return;
    }

    if (confirmPin !== newPin) {
      toast({
        title: "PIN Mismatch",
        description: "PINs do not match",
        variant: "destructive",
      });
      return;
    }

    setIsPinLoading(true);
    try {
      const response = await businessPinAPI.forgotPinConfirm({
        merchantId: merchantId || undefined,
        phoneNumber: phoneNumber || undefined,
        otp,
        newPin,
      });
      if (response.success) {
        toast({
          title: "PIN Reset Successfully",
          description: "Your business PIN has been reset",
        });
        setShowForgotPinDialog(false);
        resetPinForms();
      } else {
        toast({
          title: "Failed to Reset PIN",
          description: response.message || "Could not reset PIN",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to Reset PIN",
        description: error?.response?.data?.message || "Could not reset PIN",
        variant: "destructive",
      });
    } finally {
      setIsPinLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-black text-xl font-bold">
            Switch Account
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Personal Account Option */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Personal Account</h3>
                <p className="text-sm text-gray-600">{user?.email || user?.phoneNumber}</p>
              </div>
              <Button
                onClick={handleSwitchToPersonal}
                variant={!currentBusiness ? "default" : "outline"}
                disabled={!currentBusiness}
                className="min-w-[100px]"
              >
                {!currentBusiness ? "Active" : "Switch"}
              </Button>
            </div>
          </div>

          {/* Business Accounts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Business Accounts</h3>
              <Button
                onClick={handleRefreshBusinesses}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                {isLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            {isLoadingBusinesses ? (
              <div className="text-center py-4">
                <p className="text-gray-600">Loading business accounts...</p>
              </div>
            ) : businessAccounts.length === 0 ? (
              <div className="text-center py-4 border rounded-lg">
                <p className="text-gray-600 mb-2">No business accounts found</p>
                <Button
                  onClick={() => {
                    onClose();
                    window.location.href = '/signup/business';
                  }}
                  variant="outline"
                  size="sm"
                >
                  Create Business Account
                </Button>
              </div>
            ) : (
              businessAccounts.map((business) => (
                <div key={business.businessId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{business.businessName}</h4>
                      <p className="text-sm text-gray-600">{business.merchantId}</p>
                      <p className="text-xs text-gray-500 capitalize">{business.status}</p>
                    </div>
                    <Button
                      onClick={() => handleSwitchToBusiness(business.businessId)}
                      variant={currentBusiness?.businessId === business.businessId ? "default" : "outline"}
                      disabled={isLoading || currentBusiness?.businessId === business.businessId}
                      className="min-w-[100px]"
                    >
                      {currentBusiness?.businessId === business.businessId ? "Active" : "Switch"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Business PIN Management */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Business PIN Management</h3>
            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={() => {
                  resetPinForms();
                  setShowSetPinDialog(true);
                }}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 justify-start"
              >
                <Key className="h-4 w-4" />
                Set PIN for Business Account
              </Button>
              <Button
                onClick={() => {
                  resetPinForms();
                  setShowForgotPinDialog(true);
                }}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 justify-start"
              >
                <Unlock className="h-4 w-4" />
                Forgot Business PIN
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Use your Merchant ID or Phone Number to manage your business PIN
            </p>
          </div>
        </div>
      </DialogContent>

      {/* Set PIN Dialog */}
      <Dialog open={showSetPinDialog} onOpenChange={setShowSetPinDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>Set Business PIN</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {step === 'request' ? (
              <>
                <p className="text-gray-700 text-sm">
                  Enter your existing business account details to receive an OTP for PIN setup.
                </p>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Merchant ID</label>
                  <input
                    value={merchantId}
                    onChange={(e) => setMerchantId(e.target.value)}
                    placeholder="NX-582917"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="text-center text-xs text-gray-500">or</div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Phone Number</label>
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+2547xxxxxxx"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <Button
                  onClick={handleRequestOtp}
                  disabled={isPinLoading || (!merchantId && !phoneNumber)}
                  className="w-full"
                >
                  {isPinLoading ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              </>
            ) : (
              <>
                <p className="text-gray-700 text-sm">
                  Enter the OTP sent to your phone and set your 6-digit PIN.
                </p>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">OTP</label>
                  <input
                    value={otp}
                    onChange={(e) => handlePinInput(e.target.value, setOtp)}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full border rounded px-3 py-2 text-center text-lg tracking-widest"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">New PIN</label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => handlePinInput(e.target.value, setPin)}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full border rounded px-3 py-2 text-center text-lg tracking-widest"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Confirm PIN</label>
                  <input
                    type="password"
                    value={confirmPin}
                    onChange={(e) => handlePinInput(e.target.value, setConfirmPin)}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full border rounded px-3 py-2 text-center text-lg tracking-widest"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setStep('request')}
                    variant="outline"
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSetPin}
                    disabled={isPinLoading || otp.length !== 6 || pin.length !== 6 || confirmPin.length !== 6}
                    className="flex-1"
                  >
                    {isPinLoading ? 'Setting PIN...' : 'Set PIN'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Forgot PIN Dialog */}
      <Dialog open={showForgotPinDialog} onOpenChange={setShowForgotPinDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Business PIN</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {step === 'request' ? (
              <>
                <p className="text-gray-700 text-sm">
                  Enter your existing business account details to receive an OTP for PIN reset.
                </p>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Merchant ID</label>
                  <input
                    value={merchantId}
                    onChange={(e) => setMerchantId(e.target.value)}
                    placeholder="NX-582917"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="text-center text-xs text-gray-500">or</div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Phone Number</label>
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+2547xxxxxxx"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <Button
                  onClick={handleForgotPinRequest}
                  disabled={isPinLoading || (!merchantId && !phoneNumber)}
                  className="w-full"
                >
                  {isPinLoading ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              </>
            ) : (
              <>
                <p className="text-gray-700 text-sm">
                  Enter the OTP sent to your phone and set your new 6-digit PIN.
                </p>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">OTP</label>
                  <input
                    value={otp}
                    onChange={(e) => handlePinInput(e.target.value, setOtp)}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full border rounded px-3 py-2 text-center text-lg tracking-widest"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">New PIN</label>
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => handlePinInput(e.target.value, setNewPin)}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full border rounded px-3 py-2 text-center text-lg tracking-widest"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Confirm New PIN</label>
                  <input
                    type="password"
                    value={confirmPin}
                    onChange={(e) => handlePinInput(e.target.value, setConfirmPin)}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full border rounded px-3 py-2 text-center text-lg tracking-widest"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setStep('request')}
                    variant="outline"
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleForgotPinConfirm}
                    disabled={isPinLoading || otp.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6}
                    className="flex-1"
                  >
                    {isPinLoading ? 'Resetting PIN...' : 'Reset PIN'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
