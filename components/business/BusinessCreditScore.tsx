"use client";

import React, { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useBusinessFinance } from '@/hooks/useBusinessFinance';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  TrendingUp, 
  Shield, 
  DollarSign, 
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface BusinessCreditScoreProps {
  onLoanApplication?: () => void;
}

export const BusinessCreditScore: React.FC<BusinessCreditScoreProps> = ({ onLoanApplication }) => {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const {
    creditScore,
    creditScoreLoading,
    creditScoreError,
    getBusinessCreditScore
  } = useBusinessFinance();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load credit score when component mounts
  React.useEffect(() => {
    if (currentBusiness?.businessId) {
      getBusinessCreditScore(currentBusiness.businessId);
    }
  }, [currentBusiness, getBusinessCreditScore]);

  const handleRefresh = async () => {
    if (!currentBusiness?.businessId) return;
    
    setIsRefreshing(true);
    try {
      await getBusinessCreditScore(currentBusiness.businessId);
      toast({
        title: "Credit Score Updated",
        description: "Your credit score has been refreshed",
      });
    } catch (error) {
      console.error('Failed to refresh credit score:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 750) return 'text-green-400';
    if (score >= 650) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 750) return 'bg-green-500/20 border-green-500';
    if (score >= 650) return 'bg-yellow-500/20 border-yellow-500';
    return 'bg-red-500/20 border-red-500';
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low': return 'text-green-400 bg-green-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'high': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (!currentBusiness) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
        <p className="text-gray-400">No business account selected</p>
      </div>
    );
  }

  if (creditScoreLoading) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="h-12 w-12 text-[#0795B0] mx-auto mb-4 animate-spin" />
        <p className="text-gray-400">Loading credit score...</p>
      </div>
    );
  }

  if (creditScoreError) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-300 mb-4">{creditScoreError}</p>
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="border-[#0795B0] text-[#0795B0] hover:bg-[#0795B0] hover:text-white"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!creditScore) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
        <p className="text-gray-400">No credit score data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Credit Score</h2>
          <p className="text-gray-400">Your business credit assessment</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="border-[#0795B0] text-[#0795B0] hover:bg-[#0795B0] hover:text-white"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Credit Score Display */}
      <div className={`p-6 rounded-lg border ${getScoreBgColor(creditScore.creditScore)}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Credit Score</h3>
            <p className="text-gray-400 text-sm">Last updated: {new Date(creditScore.lastAssessment).toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${getScoreColor(creditScore.creditScore)}`}>
              {creditScore.creditScore}
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(creditScore.riskLevel)}`}>
              {creditScore.riskLevel.toUpperCase()} RISK
            </div>
          </div>
        </div>

        {/* Credit Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0A0E0E]/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-[#0795B0]" />
              <span className="text-sm font-medium text-gray-300">Credit Limit</span>
            </div>
            <p className="text-xl font-bold text-white">${creditScore.creditLimit.toLocaleString()}</p>
          </div>

          <div className="bg-[#0A0E0E]/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-[#0795B0]" />
              <span className="text-sm font-medium text-gray-300">Available Credit</span>
            </div>
            <p className="text-xl font-bold text-white">${creditScore.availableCredit.toLocaleString()}</p>
          </div>

          <div className="bg-[#0A0E0E]/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-[#0795B0]" />
              <span className="text-sm font-medium text-gray-300">Success Rate</span>
            </div>
            <p className="text-xl font-bold text-white">{creditScore.paymentHistory.successRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Business Volume Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Transaction Volume</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total Volume</span>
              <span className="text-white font-medium">${creditScore.totalVolume.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Monthly Volume</span>
              <span className="text-white font-medium">${creditScore.monthlyVolume.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Current Credit Used</span>
              <span className="text-white font-medium">${creditScore.currentCredit.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Payment History</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total Payments</span>
              <span className="text-white font-medium">{creditScore.paymentHistory.totalPayments}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Completed Payments</span>
              <span className="text-white font-medium">{creditScore.paymentHistory.completedPayments}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Success Rate</span>
              <span className="text-white font-medium">{creditScore.paymentHistory.successRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
        <div className="space-y-3">
          {creditScore.recommendations.map((recommendation, index) => (
            <div key={index} className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-gray-300 text-sm">{recommendation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={onLoanApplication}
          className="flex-1 bg-[#0795B0] hover:bg-[#0684A0] text-white"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Apply for Loan
        </Button>
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="border-[#0795B0] text-[#0795B0] hover:bg-[#0795B0] hover:text-white"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Score
        </Button>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-[#0795B0]/5 border border-[#0795B0]/20 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-2">How Credit Score Works:</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Based on payment history, transaction volume, and account age</li>
          <li>• Scores range from 300-850 (higher is better)</li>
          <li>• Updated monthly based on your business activity</li>
          <li>• Affects loan approval and credit limits</li>
        </ul>
      </div>
    </div>
  );
};
