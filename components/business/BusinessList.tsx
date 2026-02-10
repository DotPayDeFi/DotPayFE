"use client";

import React, { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { BusinessPinDialog } from './BusinessPinDialog';
import { 
  Building2, 
  CreditCard, 
  Shield, 
  RefreshCw, 
  Plus,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

interface BusinessListProps {
  onBusinessSelect?: (businessId: string) => void;
  showCreateButton?: boolean;
  className?: string;
}

export const BusinessList: React.FC<BusinessListProps> = ({
  onBusinessSelect,
  showCreateButton = true,
  className = ""
}) => {
  const { user } = useAuth();
  const {
    businessAccounts,
    currentBusiness,
    isLoadingBusinesses,
    loadBusinessAccounts,
    switchToBusiness,
    switchToPersonal,
    isPinVerified,
  } = useBusiness();
  const { toast } = useToast();

  // Debug logging
  console.log('BusinessList - businessAccounts:', businessAccounts);
  console.log('BusinessList - isLoadingBusinesses:', isLoadingBusinesses);
  console.log('BusinessList - user:', user);

  // Load businesses when component mounts if user is authenticated and no businesses loaded
  React.useEffect(() => {
    const isAuthenticated = user?.id || user?.email || user?.phoneNumber;
    if (isAuthenticated && businessAccounts.length === 0 && !isLoadingBusinesses) {
      console.log('BusinessList: Loading businesses on mount for user:', user.id || user.email || user.phoneNumber);
      loadBusinessAccounts();
    }
  }, [user?.id, user?.email, user?.phoneNumber, businessAccounts.length, isLoadingBusinesses, loadBusinessAccounts]);

  const [showPinDialog, setShowPinDialog] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadBusinessAccounts();
      toast({
        title: "Businesses Refreshed",
        description: "Your business accounts have been updated",
      });
    } catch (error) {
      toast({
        title: "Failed to Refresh",
        description: "Could not refresh business accounts",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const testApiCall = async () => {
    try {
      console.log('Testing API call directly...');
      
      // Test the API call directly
      const response = await fetch('http://localhost:8000/api/business/my-businesses', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dotpay_token')?.replace(/"/g, '')}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      toast({
        title: "API Test Result",
        description: `Status: ${response.status}, Check console for details`,
      });
    } catch (error) {
      console.error('API test failed:', error);
      toast({
        title: "API Test Failed",
        description: "Check console for error details",
        variant: "destructive",
      });
    }
  };

  const handleBusinessTap = (businessId: string) => {
    const business = businessAccounts.find(b => b.businessId === businessId);
    if (!business) return;

    // If already current business, do nothing
    if (currentBusiness?.businessId === businessId) {
      return;
    }

    // Always show PIN dialog - mode will be determined by pinSet status
    setSelectedBusiness(businessId);
    setShowPinDialog(true);
  };

  const handlePinSuccess = async () => {
    if (!selectedBusiness) return;

    const business = businessAccounts.find(b => b.businessId === selectedBusiness);
    const wasSettingPin = business && !business.pinSet;

    try {
      if (wasSettingPin) {
        // PIN was just set, reload business accounts to get updated status
        await loadBusinessAccounts();
        toast({
          title: "PIN Set Successfully",
          description: "Your business PIN has been set. You can now switch to this account.",
        });
      } else {
        // PIN was verified, switch to business account and redirect to business homepage
        await switchToBusiness(selectedBusiness);
        toast({
          title: "Switched to Business Account",
          description: "Redirecting to your business dashboard...",
        });
        
        // Small delay to ensure state updates propagate
        setTimeout(() => {
          window.location.href = '/business/home';
        }, 100);
        return;
      }
    } catch (error) {
      toast({
        title: wasSettingPin ? "Failed to Set PIN" : "Failed to Switch",
        description: wasSettingPin ? "Could not set business PIN" : "Could not switch to business account",
        variant: "destructive",
      });
    } finally {
      setShowPinDialog(false);
      setSelectedBusiness(null);
    }
  };

  const handlePersonalAccountTap = () => {
    if (!currentBusiness) return; // Already on personal account
    
    switchToPersonal();
    toast({
      title: "Switched to Personal Account",
      description: "You are now using your personal account",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'suspended':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'suspended':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoadingBusinesses) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Business Accounts</h3>
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="border border-[#0795B0] rounded-lg p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-[#0795B0]/20 rounded w-32"></div>
                  <div className="h-3 bg-[#0795B0]/20 rounded w-24"></div>
                </div>
                <div className="h-8 bg-[#0795B0]/20 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Business Accounts</h3>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            className="flex items-center gap-2 border-[#0795B0] text-[#0795B0] hover:bg-[#0795B0] hover:text-white bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            onClick={testApiCall}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white bg-transparent"
          >
            Test API
          </Button>
          {showCreateButton && (
            <Button
              onClick={() => window.location.href = '/signup/business'}
              size="sm"
              className="flex items-center gap-2 bg-[#0795B0] hover:bg-[#0684A0] text-white"
            >
              <Plus className="h-4 w-4" />
              Create
            </Button>
          )}
        </div>
      </div>

      {/* Personal Account */}
      <div 
        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
          !currentBusiness 
            ? 'border-[#0795B0] bg-[#0795B0]/10' 
            : 'border-[#0795B0] hover:border-[#0795B0]/70'
        }`}
        onClick={handlePersonalAccountTap}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0795B0]/20 rounded-lg">
              <Building2 className="h-5 w-5 text-[#0795B0]" />
            </div>
            <div>
              <h4 className="font-medium text-white">Personal Account</h4>
              <p className="text-sm text-gray-300">{user?.email || user?.phoneNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!currentBusiness && (
              <span className="px-2 py-1 text-xs font-medium text-[#0795B0] bg-[#0795B0]/20 rounded-full">
                Active
              </span>
            )}
            {currentBusiness && (
              <Button variant="outline" size="sm" className="border-[#0795B0] text-[#0795B0] hover:bg-[#0795B0] hover:text-white">
                Switch
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Business Accounts */}
      {businessAccounts.length === 0 ? (
        <div className="text-center py-8 border rounded-lg border-[#0795B0]">
          <Building2 className="h-12 w-12 text-[#0795B0] mx-auto mb-4" />
          <h4 className="text-lg font-medium text-white mb-2">No Business Accounts</h4>
          <p className="text-gray-300 mb-4">You haven&apos;t created any business accounts yet.</p>
          {showCreateButton && (
            <Button
              onClick={() => window.location.href = '/signup/business'}
              className="flex items-center gap-2 bg-[#0795B0] hover:bg-[#0684A0] text-white"
            >
              <Plus className="h-4 w-4" />
              Create Your First Business Account
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {businessAccounts.map((business) => (
            <div
              key={business.businessId}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                currentBusiness?.businessId === business.businessId
                  ? 'border-[#0795B0] bg-[#0795B0]/10'
                  : 'border-[#0795B0] hover:border-[#0795B0]/70'
              }`}
              onClick={() => handleBusinessTap(business.businessId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#0795B0]/20 rounded-lg">
                    <Building2 className="h-5 w-5 text-[#0795B0]" />
                  </div>
                  <div>
                    <h4 className="font-medium text-white">{business.businessName}</h4>
                    <p className="text-sm text-gray-300">{business.merchantId}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(business.status || 'active')}`}>
                        {getStatusIcon(business.status || 'active')}
                        <span className="ml-1 capitalize">{business.status || 'active'}</span>
                      </span>
                      {business.pinSet ? (
                        <span className="px-2 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-full flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          PIN Set
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium text-orange-600 bg-orange-100 rounded-full flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          No PIN
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentBusiness?.businessId === business.businessId && (
                    <span className="px-2 py-1 text-xs font-medium text-[#0795B0] bg-[#0795B0]/20 rounded-full">
                      Active
                    </span>
                  )}
                  {currentBusiness?.businessId !== business.businessId && (
                    <Button variant="outline" size="sm" className="border-[#0795B0] text-[#0795B0] hover:bg-[#0795B0] hover:text-white">
                      {business.pinSet ? 'Switch' : 'Set PIN'}
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Business Details */}
              <div className="mt-3 pt-3 border-t border-[#0795B0]/30">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Balance:</span>
                    <span className="ml-2 font-medium text-white">
                      KES {(business.currentBalance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Credit Limit:</span>
                    <span className="ml-2 font-medium text-white">
                      KES {business.creditLimit.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Type:</span>
                    <span className="ml-2 font-medium text-white capitalize">
                      {business.businessType.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Verified:</span>
                    <span className="ml-2 font-medium text-white">
                      {business.isVerified ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PIN Dialog */}
      {selectedBusiness && (
        <BusinessPinDialog
          isOpen={showPinDialog}
          onClose={() => {
            setShowPinDialog(false);
            setSelectedBusiness(null);
          }}
          onSuccess={handlePinSuccess}
          businessId={selectedBusiness}
          businessName={businessAccounts.find(b => b.businessId === selectedBusiness)?.businessName || ''}
          mode={businessAccounts.find(b => b.businessId === selectedBusiness)?.pinSet ? "verify" : "set"}
        />
      )}
    </div>
  );
};
