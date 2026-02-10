"use client";

import React, { useState, useEffect } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface BusinessPinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  businessId: string;
  businessName: string;
  mode: 'verify' | 'set' | 'update' | 'forgot';
  onForgotPin?: () => void;
}

export const BusinessPinDialog: React.FC<BusinessPinDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  businessId,
  businessName,
  mode,
  onForgotPin,
}) => {
  const {
    verifyBusinessPin,
    setBusinessPin,
    requestPinSetupOtp,
    setBusinessPinWithOtp,
    updateBusinessPin,
    forgotBusinessPin,
    requestPinResetOtp,
  } = useBusiness();
  const { toast } = useToast();

  const [pin, setPin] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [otp, setOtp] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'confirm'>('input');

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      setOtp('');
      setMerchantId('');
      setPhoneNumber('');
      setStep('input');
    }
  }, [isOpen]);

  const handlePinInput = (value: string, setter: (value: string) => void) => {
    // Only allow 6 digits
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length <= 6) {
      setter(digitsOnly);
    }
  };

  const handleVerifyPin = async () => {
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
      const success = await verifyBusinessPin(businessId, pin);
      if (success) {
        toast({
          title: "PIN Verified",
          description: "Access granted to business account",
        });
        onSuccess();
      } else {
        toast({
          title: "Invalid PIN",
          description: "Please check your PIN and try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "Could not verify PIN",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPin = async () => {
    if (step === 'input') {
      // Step 1: Request OTP
      setIsLoading(true);
      try {
        const success = await requestPinSetupOtp(businessId);
        if (success) {
          toast({
            title: "OTP Sent",
            description: "Please check your phone for the verification code",
          });
          setStep('confirm');
        } else {
          toast({
            title: "Failed to Send OTP",
            description: "Could not send verification code",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Failed to Send OTP",
          description: "Could not send verification code",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Step 2: Set PIN with OTP
      if (otp.length !== 6) {
        toast({
          title: "Invalid OTP",
          description: "OTP must be 6 digits",
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

      if (confirmPin !== pin) {
        toast({
          title: "PIN Mismatch",
          description: "PINs do not match",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);
      try {
        const success = await setBusinessPinWithOtp(businessId, otp, pin);
        if (success) {
          toast({
            title: "PIN Set Successfully",
            description: "Your business PIN has been set",
          });
          onSuccess();
        } else {
          toast({
            title: "Failed to Set PIN",
            description: "Could not set PIN",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Failed to Set PIN",
          description: "Could not set PIN",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUpdatePin = async () => {
    if (oldPin.length !== 6 || newPin.length !== 6) {
      toast({
        title: "Invalid PIN",
        description: "PINs must be 6 digits",
        variant: "destructive",
      });
      return;
    }

    if (confirmPin !== newPin) {
      toast({
        title: "PIN Mismatch",
        description: "New PINs do not match",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const success = await updateBusinessPin(businessId, oldPin, newPin);
      if (success) {
        toast({
          title: "PIN Updated Successfully",
          description: "Your business PIN has been updated",
        });
        onSuccess();
      } else {
        toast({
          title: "Failed to Update PIN",
          description: "Could not update PIN",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Update PIN",
        description: "Could not update PIN",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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

    setIsLoading(true);
    try {
      const success = await requestPinResetOtp(merchantId || undefined, phoneNumber || undefined);
      if (success) {
        toast({
          title: "OTP Sent",
          description: "Please check your phone for the OTP",
        });
        setStep('confirm');
      } else {
        toast({
          title: "Failed to Send OTP",
          description: "Could not send OTP",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Send OTP",
        description: "Could not send OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

    setIsLoading(true);
    try {
      const success = await forgotBusinessPin(merchantId, phoneNumber, otp, newPin);
      if (success) {
        toast({
          title: "PIN Reset Successfully",
          description: "Your business PIN has been reset",
        });
        onSuccess();
      } else {
        toast({
          title: "Failed to Reset PIN",
          description: "Could not reset PIN",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Reset PIN",
        description: "Could not reset PIN",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'verify': return 'Enter Business PIN';
      case 'set': return 'Set Business PIN';
      case 'update': return 'Update Business PIN';
      case 'forgot': return step === 'input' ? 'Reset Business PIN' : 'Confirm New PIN';
      default: return 'Business PIN';
    }
  };

  const renderContent = () => {
    if (mode === 'verify') {
      return (
        <div className="space-y-4">
          <p className="text-gray-700 text-sm">
            Enter your 6-digit PIN to access <strong>{businessName}</strong>
          </p>
          <div>
            <label className="block text-sm text-gray-700 mb-2">PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => handlePinInput(e.target.value, setPin)}
              placeholder="123456"
              maxLength={6}
              className="w-full border rounded px-3 py-2 text-center text-lg tracking-widest"
            />
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleVerifyPin}
              disabled={isLoading || pin.length !== 6}
              className="flex-1"
            >
              {isLoading ? 'Verifying...' : 'Verify PIN'}
            </Button>
            {onForgotPin && (
              <Button
                onClick={onForgotPin}
                variant="outline"
                className="flex-1"
              >
                Forgot PIN?
              </Button>
            )}
          </div>
        </div>
      );
    }

    if (mode === 'set') {
      if (step === 'input') {
        return (
          <div className="space-y-4">
            <p className="text-gray-700 text-sm">
              To set a PIN for <strong>{businessName}</strong>, we&apos;ll send a verification code to your registered phone number.
            </p>
            <Button
              onClick={handleSetPin}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Sending OTP...' : 'Send Verification Code'}
            </Button>
          </div>
        );
      } else {
        return (
          <div className="space-y-4">
            <p className="text-gray-700 text-sm">
              Enter the verification code sent to your phone and set your PIN for <strong>{businessName}</strong>
            </p>
            <div>
              <label className="block text-sm text-gray-700 mb-2">Verification Code</label>
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
            <Button
              onClick={handleSetPin}
              disabled={isLoading || otp.length !== 6 || pin.length !== 6 || confirmPin.length !== 6}
              className="w-full"
            >
              {isLoading ? 'Setting PIN...' : 'Set PIN'}
            </Button>
          </div>
        );
      }
    }

    if (mode === 'update') {
      return (
        <div className="space-y-4">
          <p className="text-gray-700 text-sm">
            Update PIN for <strong>{businessName}</strong>
          </p>
          <div>
            <label className="block text-sm text-gray-700 mb-2">Current PIN</label>
            <input
              type="password"
              value={oldPin}
              onChange={(e) => handlePinInput(e.target.value, setOldPin)}
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
          <Button
            onClick={handleUpdatePin}
            disabled={isLoading || oldPin.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6}
            className="w-full"
          >
            {isLoading ? 'Updating PIN...' : 'Update PIN'}
          </Button>
        </div>
      );
    }

    if (mode === 'forgot') {
      if (step === 'input') {
        return (
          <div className="space-y-4">
            <p className="text-gray-700 text-sm">
              Reset PIN for <strong>{businessName}</strong>
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
              disabled={isLoading || (!merchantId && !phoneNumber)}
              className="w-full"
            >
              {isLoading ? 'Sending OTP...' : 'Send OTP'}
            </Button>
          </div>
        );
      } else {
        return (
          <div className="space-y-4">
            <p className="text-gray-700 text-sm">
              Enter OTP and new PIN
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
            <Button
              onClick={handleForgotPinConfirm}
              disabled={isLoading || otp.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6}
              className="w-full"
            >
              {isLoading ? 'Resetting PIN...' : 'Reset PIN'}
            </Button>
          </div>
        );
      }
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-black text-xl font-bold">
            {getTitle()}
          </DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};
