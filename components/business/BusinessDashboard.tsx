"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building, CreditCard, TrendUp, Wallet, Users, ChartLine } from '@phosphor-icons/react';

interface BusinessData {
  businessId: string;
  businessName: string;
  ownerName: string;
  location: string;
  businessType: string;
  phoneNumber: string;
  merchantId: string;
  walletAddress: string;
  creditLimit: number;
  availableCredit: number;
  currentCredit: number;
  creditScore: number;
  riskLevel: string;
  overdraftEnabled: boolean;
  totalVolume: number;
  monthlyVolume: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export const BusinessDashboard: React.FC = () => {
  const router = useRouter();
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBusinessData();
  }, []);

  const fetchBusinessData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('dotpay_token');
      
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.dotpay.xyz' : 'http://localhost:8000'}/api/business/details`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setBusinessData(data.data);
      } else {
        setError(data.message || 'Failed to fetch business data');
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

  if (loading) {
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0795B0] mx-auto mb-4"></div>
            <p className="text-gray-300">Loading business dashboard...</p>
          </div>
        </article>
      </section>
    );
  }

  if (error) {
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
            <div className="p-6 bg-red-900/20 border border-red-500 rounded-lg max-w-md mx-auto">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-xl">!</span>
              </div>
              <h3 className="text-lg font-semibold text-red-400 mb-2">Error Loading Dashboard</h3>
              <p className="text-sm text-red-300 mb-4">{error}</p>
              <button
                onClick={fetchBusinessData}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </article>
      </section>
    );
  }

  if (!businessData) {
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
            <div className="p-6 bg-blue-900/20 border border-blue-500 rounded-lg max-w-md mx-auto">
              <Building size={48} className="text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-blue-400 mb-2">No Business Account</h3>
              <p className="text-sm text-blue-300 mb-4">You don&apos;t have a business account yet.</p>
              <button
                onClick={() => router.push('/business/create')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Create Business Account
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
          <h1 className="text-4xl text-white font-bold mb-3">{businessData.businessName}</h1>
          <p className="text-gray-400 text-lg">Business Dashboard</p>
        </div>
      </article>
      
      <article className="mt-8 flex flex-col items-center p-5 xl:px-[200px]">
        <div className="w-full max-w-6xl">
          {/* Business Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-[#0A0E0E] rounded-xl border border-[#0795B0] p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <Wallet size={24} className="text-[#0795B0] mr-3" />
                <h3 className="text-lg font-semibold text-white">Available Credit</h3>
              </div>
              <p className="text-3xl font-bold text-green-400 mb-2">
                ${businessData.availableCredit.toFixed(2)}
              </p>
              <p className="text-sm text-gray-400">
                of ${businessData.creditLimit.toFixed(2)} limit
              </p>
            </div>

            <div className="bg-[#0A0E0E] rounded-xl border border-[#0795B0] p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <CreditCard size={24} className="text-[#0795B0] mr-3" />
                <h3 className="text-lg font-semibold text-white">Current Credit</h3>
              </div>
              <p className="text-3xl font-bold text-yellow-400 mb-2">
                ${businessData.currentCredit.toFixed(2)}
              </p>
              <p className="text-sm text-gray-400">
                {businessData.overdraftEnabled ? 'Overdraft Active' : 'No Overdraft'}
              </p>
            </div>

            <div className="bg-[#0A0E0E] rounded-xl border border-[#0795B0] p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <TrendUp size={24} className="text-[#0795B0] mr-3" />
                <h3 className="text-lg font-semibold text-white">Monthly Volume</h3>
              </div>
              <p className="text-3xl font-bold text-blue-400 mb-2">
                ${businessData.monthlyVolume.toFixed(2)}
              </p>
              <p className="text-sm text-gray-400">
                Total: ${businessData.totalVolume.toFixed(2)}
              </p>
            </div>

            <div className="bg-[#0A0E0E] rounded-xl border border-[#0795B0] p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <ChartLine size={24} className="text-[#0795B0] mr-3" />
                <h3 className="text-lg font-semibold text-white">Credit Score</h3>
              </div>
              <p className={`text-3xl font-bold mb-2 ${getCreditScoreColor(businessData.creditScore)}`}>
                {businessData.creditScore}
              </p>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(businessData.riskLevel)}`}>
                {businessData.riskLevel} Risk
              </span>
            </div>
          </div>

          {/* Business Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-[#0A0E0E] rounded-xl border border-[#0795B0] p-6 shadow-lg">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <Building size={24} className="text-[#0795B0] mr-3" />
                Business Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Business Name</label>
                  <p className="text-white font-medium">{businessData.businessName}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400">Owner</label>
                  <p className="text-white font-medium">{businessData.ownerName}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400">Location</label>
                  <p className="text-white font-medium">{businessData.location}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400">Business Type</label>
                  <p className="text-white font-medium">{businessData.businessType}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400">Phone Number</label>
                  <p className="text-white font-medium">{businessData.phoneNumber}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400">Merchant ID</label>
                  <p className="text-white font-mono text-sm">{businessData.merchantId}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400">Wallet Address</label>
                  <p className="text-white font-mono text-xs break-all">
                    {businessData.walletAddress}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#0A0E0E] rounded-xl border border-[#0795B0] p-6 shadow-lg">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <Users size={24} className="text-[#0795B0] mr-3" />
                Quick Actions
              </h3>
              
              <div className="space-y-4">
                <button
                  onClick={() => router.push('/business/overdraft')}
                  className="w-full p-4 bg-[#0795B0] hover:bg-[#0684A0] text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
                >
                  <CreditCard size={20} className="mr-2" />
                  Request Overdraft
                </button>
                
                <button
                  onClick={() => router.push('/business/repay')}
                  className="w-full p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
                >
                  <TrendUp size={20} className="mr-2" />
                  Repay Overdraft
                </button>
                
                <button
                  onClick={() => router.push('/business/history')}
                  className="w-full p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
                >
                  <ChartLine size={20} className="mr-2" />
                  View History
                </button>
                
                <button
                  onClick={() => router.push('/business/settings')}
                  className="w-full p-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
                >
                  <Building size={20} className="mr-2" />
                  Business Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
};
