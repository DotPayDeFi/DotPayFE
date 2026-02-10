"use client";

import React, { useState } from 'react';
import { useBusiness } from '@/context/BusinessContext';
import { useBusinessFinance } from '@/hooks/useBusinessFinance';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';

interface BusinessLoanApplicationProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export const BusinessLoanApplication: React.FC<BusinessLoanApplicationProps> = ({ 
  onBack, 
  onSuccess 
}) => {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const {
    loanApplication,
    loanLoading,
    loanError,
    applyForLoan
  } = useBusinessFinance();

  const [formData, setFormData] = useState({
    loanAmount: '',
    purpose: '',
    repaymentPeriod: '12'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentBusiness?.businessId) {
      toast({
        title: "Error",
        description: "No business account selected",
        variant: "destructive",
      });
      return;
    }

    if (!formData.loanAmount || parseFloat(formData.loanAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid loan amount",
        variant: "destructive",
      });
      return;
    }

    if (!formData.purpose.trim()) {
      toast({
        title: "Purpose Required",
        description: "Please enter the purpose of the loan",
        variant: "destructive",
      });
      return;
    }

    const loanAmount = parseFloat(formData.loanAmount);
    const availableCredit = currentBusiness?.availableCredit || 0;

    if (loanAmount > availableCredit) {
      toast({
        title: "Amount Exceeds Credit Limit",
        description: `Maximum loan amount is $${availableCredit.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await applyForLoan({
        businessId: currentBusiness.businessId,
        loanAmount,
        purpose: formData.purpose.trim(),
        repaymentPeriod: parseInt(formData.repaymentPeriod)
      });

      if (result) {
        toast({
          title: "Loan Application Submitted",
          description: "Your loan application has been submitted successfully",
        });
        
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Loan application error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateMonthlyPayment = (amount: number, months: number, interestRate: number = 8.5) => {
    const monthlyRate = interestRate / 100 / 12;
    const monthlyPayment = (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                          (Math.pow(1 + monthlyRate, months) - 1);
    return monthlyPayment;
  };

  const loanAmount = parseFloat(formData.loanAmount) || 0;
  const repaymentMonths = parseInt(formData.repaymentPeriod) || 12;
  const estimatedMonthlyPayment = calculateMonthlyPayment(loanAmount, repaymentMonths);

  if (!currentBusiness) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
        <p className="text-gray-400">No business account selected</p>
      </div>
    );
  }

  if (loanApplication) {
    return (
      <div className="space-y-6">
        {/* Success Header */}
        <div className="text-center">
          <div className="p-3 bg-green-500/20 rounded-full inline-block mb-4">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Application Submitted</h2>
          <p className="text-gray-400">Your loan application has been received</p>
        </div>

        {/* Application Details */}
        <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Application Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Loan ID</p>
              <p className="text-white font-medium">{loanApplication.loanApplication.loanId}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Business</p>
              <p className="text-white font-medium">{loanApplication.loanApplication.businessName}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Loan Amount</p>
              <p className="text-white font-medium">${loanApplication.loanApplication.loanAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Purpose</p>
              <p className="text-white font-medium">{loanApplication.loanApplication.purpose}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Repayment Period</p>
              <p className="text-white font-medium">{loanApplication.loanApplication.repaymentPeriod} months</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Interest Rate</p>
              <p className="text-white font-medium">{loanApplication.loanApplication.interestRate}%</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Monthly Payment</p>
              <p className="text-white font-medium">${loanApplication.loanApplication.monthlyPayment.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Status</p>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                loanApplication.loanApplication.status === 'pending_approval' 
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-green-500/20 text-green-400'
              }`}>
                {loanApplication.loanApplication.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-[#0795B0]/5 border border-[#0795B0]/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Next Steps</h3>
          <div className="space-y-3">
            {loanApplication.nextSteps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[#0795B0] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <p className="text-gray-300 text-sm">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-[#0795B0]/10 rounded-lg">
            <p className="text-[#0795B0] text-sm font-medium">
              Estimated approval time: {loanApplication.estimatedApprovalTime}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {onBack && (
            <Button
              onClick={onBack}
              variant="outline"
              className="flex-1 border-[#0795B0] text-[#0795B0] hover:bg-[#0795B0] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Credit Score
            </Button>
          )}
          <Button
            onClick={() => window.location.reload()}
            className="flex-1 bg-[#0795B0] hover:bg-[#0684A0] text-white"
          >
            View Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Apply for Loan</h2>
          <p className="text-gray-400">Get funding for your business needs</p>
        </div>
      </div>

      {/* Credit Score Summary */}
      {currentBusiness && (
        <div className="bg-gradient-to-r from-[#0795B0] to-[#0684A0] rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Available Credit</p>
              <h3 className="text-2xl font-bold text-white">
                ${currentBusiness.availableCredit?.toLocaleString() || '0'}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-white/80 text-sm">Credit Score</p>
              <h3 className="text-2xl font-bold text-white">N/A</h3>
            </div>
          </div>
        </div>
      )}

      {/* Loan Application Form */}
      <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Loan Amount (USD)
              </label>
              <input
                type="number"
                value={formData.loanAmount}
                onChange={(e) => handleInputChange('loanAmount', e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                max={currentBusiness?.availableCredit || 0}
                className="w-full px-3 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Maximum: ${currentBusiness?.availableCredit?.toLocaleString() || '0'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Repayment Period (Months)
              </label>
              <select
                value={formData.repaymentPeriod}
                onChange={(e) => handleInputChange('repaymentPeriod', e.target.value)}
                className="w-full px-3 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent"
                required
              >
                <option value="6">6 months</option>
                <option value="12">12 months</option>
                <option value="18">18 months</option>
                <option value="24">24 months</option>
                <option value="36">36 months</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Purpose of Loan
            </label>
            <textarea
              value={formData.purpose}
              onChange={(e) => handleInputChange('purpose', e.target.value)}
              placeholder="Describe how you plan to use the loan funds..."
              rows={4}
              className="w-full px-3 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent"
              required
            />
          </div>

          {/* Loan Calculation Preview */}
          {loanAmount > 0 && (
            <div className="bg-[#0795B0]/5 border border-[#0795B0]/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-3">Loan Preview</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Loan Amount</p>
                  <p className="text-white font-medium">${loanAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400">Interest Rate</p>
                  <p className="text-white font-medium">8.5% APR</p>
                </div>
                <div>
                  <p className="text-gray-400">Monthly Payment</p>
                  <p className="text-white font-medium">${estimatedMonthlyPayment.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {loanError && (
            <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <p className="text-red-300 text-sm">{loanError}</p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || loanLoading || !formData.loanAmount || !formData.purpose}
            className="w-full bg-[#0795B0] hover:bg-[#0684A0] text-white"
          >
            {isSubmitting || loanLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting Application...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Submit Loan Application
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Terms and Conditions */}
      <div className="p-4 bg-[#0795B0]/5 border border-[#0795B0]/20 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-2">Terms & Conditions:</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Interest rate: 8.5% APR (subject to credit assessment)</li>
          <li>• No prepayment penalties</li>
          <li>• Loan approval subject to credit score and business verification</li>
          <li>• Funds will be deposited to your business account upon approval</li>
        </ul>
      </div>
    </div>
  );
};
