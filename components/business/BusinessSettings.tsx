"use client";

import React, { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useAuth } from '@/context/AuthContext';
import { businessPinAPI } from '@/lib/business-pin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { 
  Building2, 
  Shield, 
  Key, 
  Lock, 
  Unlock, 
  Plus, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Smartphone,
  User,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BusinessSettingsProps {
  className?: string;
}

export const BusinessSettings: React.FC<BusinessSettingsProps> = ({ className = "" }) => {
  const { user } = useAuth();
  const { 
    businessAccounts, 
    currentBusiness, 
    isPinVerified, 
    loadBusinessAccounts,
    switchToBusiness,
    switchToPersonal
  } = useBusiness();
  const { toast } = useToast();
  const router = useRouter();

  // Dialog states
  const [showSetPinDialog, setShowSetPinDialog] = useState(false);
  const [showUpdatePinDialog, setShowUpdatePinDialog] = useState(false);
  const [showForgotPinDialog, setShowForgotPinDialog] = useState(false);
  const [showCreateBusinessDialog, setShowCreateBusinessDialog] = useState(false);

  // PIN form states
  const [pin, setPin] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [otp, setOtp] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [isLoading, setIsLoading] = useState(false);

  const handlePinInput = (value: string, setter: (value: string) => void) => {
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length <= 6) {
      setter(digitsOnly);
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
      setIsLoading(false);
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

    setIsLoading(true);
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
        resetForms();
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
      setIsLoading(false);
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

    setIsLoading(true);
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
        resetForms();
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
      setIsLoading(false);
    }
  };

  const resetForms = () => {
    setPin('');
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setOtp('');
    setMerchantId('');
    setPhoneNumber('');
    setStep('request');
  };

  const handleCreateBusiness = () => {
    router.push('/signup/business');
  };

  const handleSwitchToBusiness = async (businessId: string) => {
    try {
      await switchToBusiness(businessId);
      toast({
        title: "Switched to Business Account",
        description: "You are now using your business account",
      });
    } catch (error) {
      toast({
        title: "Failed to Switch",
        description: "Could not switch to business account",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Business Account Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Business Account Management
          </CardTitle>
          <CardDescription>
            Manage your business accounts and switch between personal and business modes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Account Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">
                  {currentBusiness ? currentBusiness.businessName : 'Personal Account'}
                </p>
                <p className="text-sm text-gray-600">
                  {currentBusiness ? currentBusiness.merchantId : user?.email}
                </p>
              </div>
            </div>
            <Badge variant={currentBusiness ? "default" : "secondary"}>
              {currentBusiness ? "Business" : "Personal"}
            </Badge>
          </div>

          {/* Business Accounts List */}
          {businessAccounts.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Your Business Accounts</h4>
              {businessAccounts.map((business) => (
                <div key={business._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{business.businessName}</p>
                    <p className="text-sm text-gray-600">{business.merchantId}</p>
                    <p className="text-xs text-gray-500 capitalize">{business.status}</p>
                  </div>
                  <div className="flex gap-2">
                    {currentBusiness?._id === business._id ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSwitchToBusiness(business.businessId)}
                      >
                        Switch
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => setShowCreateBusinessDialog(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Business Account
            </Button>
            <Button
              onClick={loadBusinessAccounts}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Business PIN Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Business PIN Security
          </CardTitle>
          <CardDescription>
            Secure your business account with a 6-digit PIN for enhanced security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* PIN Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Shield className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">PIN Security</p>
                <p className="text-sm text-gray-600">
                  {businessAccounts.length > 0 
                    ? (isPinVerified ? "PIN verified and active" : "PIN verification required")
                    : "Set up PIN for your business account"
                  }
                </p>
              </div>
            </div>
            <Badge variant={businessAccounts.length > 0 ? (isPinVerified ? "default" : "destructive") : "secondary"}>
              {businessAccounts.length > 0 
                ? (isPinVerified ? "Verified" : "Not Verified")
                : "Not Set"
              }
            </Badge>
          </div>

          {/* PIN Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              onClick={() => setShowSetPinDialog(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Key className="h-4 w-4" />
              Set PIN
            </Button>
            <Button
              onClick={() => setShowUpdatePinDialog(true)}
              variant="outline"
              className="flex items-center gap-2"
              disabled={businessAccounts.length === 0}
            >
              <Lock className="h-4 w-4" />
              Update PIN
            </Button>
            <Button
              onClick={() => setShowForgotPinDialog(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Unlock className="h-4 w-4" />
              Forgot PIN
            </Button>
          </div>

          {/* Help Text */}
          {businessAccounts.length === 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> You can set up a PIN for an existing business account using your Merchant ID or Phone Number. 
                If you don&apos;t have a business account yet, create one first.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This is for setting up a PIN on an existing business account.
                    If you don&apos;t have a business account, create one first.
                  </p>
                </div>
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
                    disabled={isLoading || otp.length !== 6 || pin.length !== 6 || confirmPin.length !== 6}
                    className="flex-1"
                  >
                    {isLoading ? 'Setting PIN...' : 'Set PIN'}
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
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This is for resetting a PIN on an existing business account.
                    If you don&apos;t have a business account, create one first.
                  </p>
                </div>
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
                  disabled={isLoading || (!merchantId && !phoneNumber)}
                  className="w-full"
                >
                  {isLoading ? 'Sending OTP...' : 'Send OTP'}
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
                    disabled={isLoading || otp.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6}
                    className="flex-1"
                  >
                    {isLoading ? 'Resetting PIN...' : 'Reset PIN'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Business Dialog */}
      <Dialog open={showCreateBusinessDialog} onOpenChange={setShowCreateBusinessDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>Create Business Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-700 text-sm">
              Create a new business account to start accepting payments and managing your business finances.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Business Account Features</p>
                  <p className="text-sm text-blue-700">Accept payments, manage transactions, and more</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Enhanced Security</p>
                  <p className="text-sm text-green-700">6-digit PIN protection for all business operations</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowCreateBusinessDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateBusiness}
                className="flex-1"
              >
                Create Business Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
