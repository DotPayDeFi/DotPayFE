"use client";

import React, { useState, useEffect } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { businessActionsAPI, CreditAssessment, OverdraftHistory } from '@/lib/business-actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3
} from 'lucide-react';

interface BusinessOverdraftProps {
  className?: string;
}

export const BusinessOverdraft: React.FC<BusinessOverdraftProps> = ({ className = "" }) => {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  
  const [creditAssessment, setCreditAssessment] = useState<CreditAssessment | null>(null);
  const [overdraftHistory, setOverdraftHistory] = useState<OverdraftHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestPurpose, setRequestPurpose] = useState('');
  const [repaymentPeriod, setRepaymentPeriod] = useState('30');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentBusiness?.businessId) {
      loadOverdraftData();
    }
  }, [currentBusiness]);

  const loadOverdraftData = async () => {
    if (!currentBusiness?.businessId) return;
    
    setIsLoading(true);
    try {
      const [assessmentResponse, historyResponse] = await Promise.all([
        businessActionsAPI.getCreditAssessment(currentBusiness.businessId),
        businessActionsAPI.getOverdraftHistory(currentBusiness.businessId)
      ]);

      if (assessmentResponse.success) {
        setCreditAssessment(assessmentResponse.data);
      }

      if (historyResponse.success) {
        setOverdraftHistory(historyResponse.data);
      }
    } catch (error) {
      console.error('Failed to load overdraft data:', error);
      toast({
        title: "Failed to Load Data",
        description: "Could not load overdraft information",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOverdraft = async () => {
    if (!currentBusiness?.businessId || !requestAmount || !requestPurpose) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await businessActionsAPI.requestOverdraft({
        businessId: currentBusiness.businessId,
        amount: parseFloat(requestAmount),
        purpose: requestPurpose,
        repaymentPeriod: parseInt(repaymentPeriod)
      });

      if (response.success) {
        toast({
          title: "Overdraft Request Submitted",
          description: `Request ID: ${response.data.requestId}. Estimated approval time: ${response.data.estimatedApprovalTime}`,
        });
        setShowRequestForm(false);
        setRequestAmount('');
        setRequestPurpose('');
        loadOverdraftData();
      } else {
        toast({
          title: "Request Failed",
          description: response.message || "Could not submit overdraft request",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Request Failed",
        description: error?.response?.data?.message || "Could not submit overdraft request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleOverdraft = async () => {
    if (!currentBusiness?.businessId) return;

    try {
      const response = await businessActionsAPI.toggleOverdraft({
        businessId: currentBusiness.businessId,
        enabled: !currentBusiness.overdraftEnabled
      });

      if (response.success) {
        toast({
          title: "Overdraft Settings Updated",
          description: `Overdraft ${response.data.overdraftEnabled ? 'enabled' : 'disabled'}`,
        });
        loadOverdraftData();
      }
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error?.response?.data?.message || "Could not update overdraft settings",
        variant: "destructive",
      });
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
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
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-[#0795B0]/20 rounded-lg p-4">
                <div className="h-4 bg-[#0795B0]/20 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-[#0795B0]/20 rounded w-1/2"></div>
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
        <h2 className="text-xl font-bold text-white">Business Credit & Overdraft</h2>
        <Button
          onClick={() => setShowRequestForm(!showRequestForm)}
          className="bg-[#0795B0] hover:bg-[#0684A0] text-white"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Request Overdraft
        </Button>
      </div>

      {/* Credit Assessment */}
      {creditAssessment && (
        <div className="bg-[#0795B0]/5 border border-[#0795B0]/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-[#0795B0]" />
            Credit Assessment
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#0795B0]">{creditAssessment.creditScore}</div>
              <div className="text-sm text-gray-400">Credit Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">KES {creditAssessment.creditLimit.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Credit Limit</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">KES {creditAssessment.availableCredit.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Available Credit</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">KES {creditAssessment.currentDebt.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Current Debt</div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Risk Level:</span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskLevelColor(creditAssessment.riskLevel)}`}>
                {creditAssessment.riskLevel.toUpperCase()}
              </span>
            </div>
            <Button
              onClick={toggleOverdraft}
              variant="outline"
              size="sm"
              className="border-[#0795B0] text-[#0795B0] hover:bg-[#0795B0] hover:text-white"
            >
              {currentBusiness?.overdraftEnabled ? 'Disable' : 'Enable'} Overdraft
            </Button>
          </div>

          {creditAssessment.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-white mb-2">Recommendations:</h4>
              <ul className="space-y-1">
                {creditAssessment.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-300 flex items-start">
                    <CheckCircle className="h-3 w-3 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Request Overdraft Form */}
      {showRequestForm && (
        <div className="bg-[#0795B0]/5 border border-[#0795B0]/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Request Business Overdraft</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Amount (KES)</label>
              <input
                type="number"
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full bg-transparent border border-[#0795B0]/30 rounded px-3 py-2 text-white placeholder-gray-500 focus:border-[#0795B0] focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Purpose</label>
              <input
                type="text"
                value={requestPurpose}
                onChange={(e) => setRequestPurpose(e.target.value)}
                placeholder="e.g., Working capital, Equipment purchase"
                className="w-full bg-transparent border border-[#0795B0]/30 rounded px-3 py-2 text-white placeholder-gray-500 focus:border-[#0795B0] focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Repayment Period (days)</label>
              <select
                value={repaymentPeriod}
                onChange={(e) => setRepaymentPeriod(e.target.value)}
                className="w-full bg-[#0A0E0E] border border-[#0795B0]/30 rounded px-3 py-2 text-white focus:border-[#0795B0] focus:outline-none"
              >
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={handleRequestOverdraft}
                disabled={isSubmitting}
                className="flex-1 bg-[#0795B0] hover:bg-[#0684A0] text-white"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
              <Button
                onClick={() => setShowRequestForm(false)}
                variant="outline"
                className="flex-1 border-[#0795B0] text-[#0795B0] hover:bg-[#0795B0] hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Overdraft History */}
      {overdraftHistory && overdraftHistory.history.length > 0 && (
        <div className="bg-[#0795B0]/5 border border-[#0795B0]/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-[#0795B0]" />
            Overdraft History
          </h3>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold text-red-400">KES {overdraftHistory.totalBorrowed.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Total Borrowed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">KES {overdraftHistory.totalRepaid.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Total Repaid</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">KES {overdraftHistory.currentBalance.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Current Balance</div>
            </div>
          </div>
          
          <div className="space-y-2">
            {overdraftHistory.history.slice(0, 5).map((transaction) => (
              <div key={transaction.transactionId} className="flex items-center justify-between p-3 bg-[#0A0E0E] rounded-lg">
                <div className="flex items-center gap-3">
                  {transaction.type === 'borrow' ? (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-white">
                      {transaction.type === 'borrow' ? 'Borrowed' : 'Repaid'} KES {transaction.amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(transaction.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                    transaction.status === 'completed' 
                      ? 'text-green-600 bg-green-100' 
                      : 'text-yellow-600 bg-yellow-100'
                  }`}>
                    {transaction.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
