"use client";

import React, { useState, useEffect } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { businessActionsAPI, BusinessDetails, BusinessStatus } from '@/lib/business-actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  CreditCard,
  Activity,
  Calendar,
  RefreshCw
} from 'lucide-react';

interface BusinessAnalyticsProps {
  className?: string;
}

export const BusinessAnalytics: React.FC<BusinessAnalyticsProps> = ({ className = "" }) => {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails | null>(null);
  const [businessStatus, setBusinessStatus] = useState<BusinessStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  useEffect(() => {
    if (currentBusiness?.businessId) {
      loadBusinessAnalytics();
    }
  }, [currentBusiness]);

  const loadBusinessAnalytics = async () => {
    setIsLoading(true);
    try {
      const [detailsResponse, statusResponse] = await Promise.all([
        businessActionsAPI.getBusinessDetails(),
        businessActionsAPI.getBusinessStatus()
      ]);

      if (detailsResponse.success) {
        setBusinessDetails(detailsResponse.data);
      }

      if (statusResponse.success) {
        setBusinessStatus(statusResponse.data);
      }
    } catch (error) {
      console.error('Failed to load business analytics:', error);
      toast({
        title: "Failed to Load Analytics",
        description: "Could not load business analytics data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'suspended':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-[#0795B0]/20 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-[#0795B0]/20 rounded-lg p-4">
                <div className="h-4 bg-[#0795B0]/20 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-[#0795B0]/20 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center">
          <BarChart3 className="h-6 w-6 mr-2 text-[#0795B0]" />
          Business Analytics
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-[#0A0E0E] border border-[#0795B0]/30 rounded px-3 py-2 text-white text-sm focus:border-[#0795B0] focus:outline-none"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <Button
            onClick={loadBusinessAnalytics}
            variant="outline"
            size="sm"
            className="border-[#0795B0] text-[#0795B0] hover:bg-[#0795B0] hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-[#0795B0] to-[#0684A0] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Available Credit</p>
              <h3 className="text-2xl font-bold text-white">
                KES {(businessDetails?.availableCredit || 0).toLocaleString()}
              </h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-[#0795B0]/5 border border-[#0795B0]/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Credit Limit</p>
              <h3 className="text-2xl font-bold text-white">
                KES {(businessDetails?.creditLimit || 0).toLocaleString()}
              </h3>
            </div>
            <div className="p-2 bg-[#0795B0]/20 rounded-lg">
              <DollarSign className="h-6 w-6 text-[#0795B0]" />
            </div>
          </div>
        </div>

        <div className="bg-[#0795B0]/5 border border-[#0795B0]/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Business Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(businessStatus?.status || 'pending')}`}>
                  {businessStatus?.status?.toUpperCase() || 'PENDING'}
                </span>
              </div>
            </div>
            <div className="p-2 bg-[#0795B0]/20 rounded-lg">
              <Activity className="h-6 w-6 text-[#0795B0]" />
            </div>
          </div>
        </div>

        <div className="bg-[#0795B0]/5 border border-[#0795B0]/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Account Age</p>
              <h3 className="text-2xl font-bold text-white">
                {businessDetails?.createdAt 
                  ? Math.floor((new Date().getTime() - new Date(businessDetails.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                  : 0
                } days
              </h3>
            </div>
            <div className="p-2 bg-[#0795B0]/20 rounded-lg">
              <Calendar className="h-6 w-6 text-[#0795B0]" />
            </div>
          </div>
        </div>
      </div>

      {/* Business Health Score */}
      <div className="bg-[#0795B0]/5 border border-[#0795B0]/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-[#0795B0]" />
          Business Health Score
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-2">
              <div className="w-full h-full rounded-full border-4 border-gray-700"></div>
              <div 
                className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-[#0795B0] border-t-transparent transform -rotate-90"
                style={{
                  background: `conic-gradient(from 0deg, #0795B0 ${(businessStatus?.isVerified ? 85 : 45)}%, transparent ${(businessStatus?.isVerified ? 85 : 45)}%)`
                }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">{businessStatus?.isVerified ? 85 : 45}%</span>
              </div>
            </div>
            <p className="text-sm text-gray-400">Overall Score</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Verification Status</span>
              <span className={`text-sm font-medium ${businessStatus?.isVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                {businessStatus?.isVerified ? 'Verified' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">PIN Security</span>
              <span className={`text-sm font-medium ${businessStatus?.pinSet ? 'text-green-400' : 'text-red-400'}`}>
                {businessStatus?.pinSet ? 'Secured' : 'Not Set'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Overdraft Status</span>
              <span className={`text-sm font-medium ${businessStatus?.overdraftEnabled ? 'text-green-400' : 'text-gray-400'}`}>
                {businessStatus?.overdraftEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white">Recommendations</h4>
            <ul className="space-y-1 text-sm text-gray-400">
              {!businessStatus?.isVerified && (
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-1">•</span>
                  Complete business verification
                </li>
              )}
              {!businessStatus?.pinSet && (
                <li className="flex items-start">
                  <span className="text-red-400 mr-1">•</span>
                  Set up business PIN for security
                </li>
              )}
              {!businessStatus?.overdraftEnabled && (
                <li className="flex items-start">
                  <span className="text-blue-400 mr-1">•</span>
                  Consider enabling overdraft facility
                </li>
              )}
              <li className="flex items-start">
                <span className="text-green-400 mr-1">•</span>
                Increase transaction volume
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Transaction Summary Placeholder */}
      <div className="bg-[#0795B0]/5 border border-[#0795B0]/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-[#0795B0]" />
          Transaction Summary
        </h3>
        
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">Transaction data will appear here</p>
          <p className="text-gray-500 text-sm">Connect your business to start tracking transactions</p>
        </div>
      </div>
    </div>
  );
};
