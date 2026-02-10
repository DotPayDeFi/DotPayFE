"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, CheckCircle, Warning, TrendUp } from '@phosphor-icons/react';

interface CreditAssessment {
  creditScore: number;
  riskLevel: string;
  creditLimit: number;
  availableCredit: number;
  currentCredit: number;
  totalVolume: number;
  monthlyVolume: number;
  paymentSuccessRate: number;
  recommendations: string[];
}

export const OverdraftRequestForm: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [assessment, setAssessment] = useState<CreditAssessment | null>(null);
  const [businessId, setBusinessId] = useState<string>('');
  
  const [formData, setFormData] = useState({
    amount: '',
    purpose: '',
  });

  useEffect(() => {
    fetchCreditAssessment();
  }, []);

  const fetchCreditAssessment = async () => {
    try {
      const token = localStorage.getItem('dotpay_token');
      const user = localStorage.getItem('dotpay_user');
      
      if (!token || !user) {
        router.push('/login');
        return;
      }

      const userData = JSON.parse(user);
      setBusinessId(userData.id);

      const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.dotpay.xyz' : 'http://localhost:8000'}/api/business/overdraft/assessment/${userData.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setAssessment(data.data);
      } else {
        setError(data.message || 'Failed to fetch credit assessment');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('dotpay_token');
      
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.dotpay.xyz' : 'http://localhost:8000'}/api/business/overdraft/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: businessId,
          amount: parseFloat(formData.amount),
          purpose: formData.purpose,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Failed to request overdraft');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    router.push('/home');
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low':
        return 'text-green-400 bg-green-900/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-900/20';
      case 'high':
        return 'text-red-400 bg-red-900/20';
      default:
        return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getCreditScoreColor = (score: number) => {
    if (score >= 700) return 'text-green-400';
    if (score >= 500) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (success) {
    return (
      <section className="home-background">
        <article className="bg-[#0A0E0E] flex flex-col p-5 xl:px-[200px] border-0 border-b border-[#0795B0]">
          <div className="flex items-center mb-6">
            <button
              onClick={handleBackToHome}
              className="flex items-center text-white hover:text-[#0795B0] transition-colors duration-200 cursor-pointer"
            >
              <ArrowLeft size={24} className="mr-2" />
              <span className="text-lg font-medium">Back to Home</span>
            </button>
          </div>
          
          <div className="text-center">
            <div className="p-8 bg-green-900/20 border border-green-500 rounded-lg max-w-md mx-auto">
              <CheckCircle size={64} className="text-green-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-green-400 mb-4">Overdraft Request Successful!</h3>
              <p className="text-green-300 mb-6">
                Your overdraft request has been processed and funds have been transferred to your business wallet.
              </p>
              <button
                onClick={() => router.push('/business')}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Go to Business Dashboard
              </button>
            </div>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="home-background">
      <article className="bg-[#0A0E0E] flex flex-col p-5 xl:px-[200px] border-0 border-b border-[#0795B0]">
        <div className="flex items-center mb-6">
          <button
            onClick={handleBackToHome}
            className="flex items-center text-white hover:text-[#0795B0] transition-colors duration-200 cursor-pointer"
          >
            <ArrowLeft size={24} className="mr-2" />
            <span className="text-lg font-medium">Back to Home</span>
          </button>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-4xl text-white font-bold mb-3">Request Overdraft</h1>
          <p className="text-gray-400 text-lg">Access instant credit based on your business performance</p>
        </div>
      </article>
      
      <article className="mt-8 flex flex-col items-center p-5 xl:px-[200px]">
        <div className="w-full max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Credit Assessment */}
            <div className="bg-[#0A0E0E] rounded-xl border border-[#0795B0] p-6 shadow-lg">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <TrendUp size={24} className="text-[#0795B0] mr-3" />
                Credit Assessment
              </h3>
              
              {assessment ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#1A1E1E] border border-[#0795B0] rounded-lg">
                      <p className="text-sm text-gray-400 mb-1">Credit Score</p>
                      <p className={`text-2xl font-bold ${getCreditScoreColor(assessment.creditScore)}`}>
                        {assessment.creditScore}
                      </p>
                    </div>
                    <div className="p-4 bg-[#1A1E1E] border border-[#0795B0] rounded-lg">
                      <p className="text-sm text-gray-400 mb-1">Risk Level</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(assessment.riskLevel)}`}>
                        {assessment.riskLevel}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400">Available Credit</label>
                      <p className="text-white font-medium text-lg">${assessment.availableCredit.toFixed(2)}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-400">Current Credit Used</label>
                      <p className="text-white font-medium text-lg">${assessment.currentCredit.toFixed(2)}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-400">Total Credit Limit</label>
                      <p className="text-white font-medium text-lg">${assessment.creditLimit.toFixed(2)}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-400">Payment Success Rate</label>
                      <p className="text-white font-medium text-lg">{(assessment.paymentSuccessRate * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-2">Recommendations</label>
                    <ul className="space-y-2">
                      {assessment.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-300 flex items-start">
                          <span className="text-[#0795B0] mr-2">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0795B0] mx-auto mb-4"></div>
                  <p className="text-gray-300">Loading credit assessment...</p>
                </div>
              )}
            </div>

            {/* Overdraft Request Form */}
            <div className="bg-[#0A0E0E] rounded-xl border border-[#0795B0] p-6 shadow-lg">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <CreditCard size={24} className="text-[#0795B0] mr-3" />
                Request Overdraft
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">
                    Amount (USDC) *
                  </label>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent hover:border-[#0AA5C0] transition-colors duration-200"
                    placeholder="50.00"
                    step="0.01"
                    min="0"
                    max={assessment?.availableCredit || 0}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Maximum available: ${assessment?.availableCredit.toFixed(2) || '0.00'}
                  </p>
                </div>

                <div>
                  <label htmlFor="purpose" className="block text-sm font-medium text-gray-300 mb-2">
                    Purpose *
                  </label>
                  <textarea
                    id="purpose"
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent hover:border-[#0AA5C0] transition-colors duration-200 resize-none"
                    placeholder="e.g., Working capital for inventory, Equipment purchase, etc."
                    required
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg">
                    <div className="flex items-center">
                      <Warning size={20} className="text-red-400 mr-2" />
                      <p className="text-red-300 text-sm">{error}</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !assessment || parseFloat(formData.amount) > (assessment?.availableCredit || 0)}
                  className="w-full py-4 px-6 bg-[#0795B0] hover:bg-[#0684A0] text-white rounded-lg font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0795B0] disabled:opacity-50 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard size={20} className="mr-2" />
                      Request Overdraft
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
};
