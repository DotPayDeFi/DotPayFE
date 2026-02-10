"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building, CheckCircle, Warning, Eye, EyeSlash } from '@phosphor-icons/react';

interface BusinessFormData {
  businessName: string;
  ownerName: string;
  location: string;
  businessType: string;
  phoneNumber: string;
}

export const BusinessCreationForm: React.FC = () => {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  
  const [formData, setFormData] = useState<BusinessFormData>({
    businessName: '',
    ownerName: '',
    location: '',
    businessType: '',
    phoneNumber: '',
  });

  useEffect(() => {
    // Auto-fill phone number from user account
    const user = localStorage.getItem('dotpay_user');
    if (user) {
      const userData = JSON.parse(user);
      setFormData(prev => ({
        ...prev,
        phoneNumber: userData.phoneNumber || '',
      }));
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      const user = localStorage.getItem('dotpay_user');
      
      if (!token || !user) {
        router.push('/login');
        return;
      }

      const userData = JSON.parse(user);

      const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.dotpay.xyz' : 'http://localhost:8000'}/api/business/request-upgrade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.id,
          phoneNumber: formData.phoneNumber,
          businessName: formData.businessName,
          ownerName: formData.ownerName,
          location: formData.location,
          businessType: formData.businessType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Immediately show OTP form since OTP is logged in server
        setStep('otp');
        // Auto-focus OTP input
        setTimeout(() => {
          const otpInput = document.getElementById('otp');
          if (otpInput) {
            otpInput.focus();
          }
        }, 100);
      } else {
        setError(data.message || 'Failed to request business creation');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('dotpay_token');
      const user = localStorage.getItem('dotpay_user');
      
      if (!token || !user) {
        router.push('/login');
        return;
      }

      const userData = JSON.parse(user);

      const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'https://api.dotpay.xyz' : 'http://localhost:8000'}/api/business/complete-upgrade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userData.id,
          phoneNumber: formData.phoneNumber,
          otp: otp,
          businessName: formData.businessName,
          ownerName: formData.ownerName,
          location: formData.location,
          businessType: formData.businessType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('success');
      } else {
        setError(data.message || 'Failed to complete business creation');
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

  const businessTypes = [
    'Technology Services',
    'Retail & E-commerce',
    'Food & Beverage',
    'Healthcare',
    'Education',
    'Finance & Banking',
    'Real Estate',
    'Transportation',
    'Entertainment',
    'Manufacturing',
    'Consulting',
    'Other'
  ];

  if (step === 'success') {
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
              <h3 className="text-2xl font-bold text-green-400 mb-4">Business Created Successfully!</h3>
              <p className="text-green-300 mb-6">
                Your business account has been created and is ready to use.
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
          <h1 className="text-4xl text-white font-bold mb-3">Create Business Account</h1>
          <p className="text-gray-400 text-lg">
            {step === 'form' ? 'Set up your business profile to access credit and overdraft facilities' : 'Enter the verification code from server logs'}
          </p>
        </div>
      </article>
      
      <article className="mt-8 flex flex-col items-center p-5 xl:px-[200px]">
        <div className="w-full max-w-2xl">
          <div className="bg-[#0A0E0E] rounded-xl border border-[#0795B0] p-8 shadow-lg">
            {step === 'form' ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-300 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent hover:border-[#0AA5C0] transition-colors duration-200"
                    placeholder="Enter your business name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="ownerName" className="block text-sm font-medium text-gray-300 mb-2">
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    id="ownerName"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent hover:border-[#0AA5C0] transition-colors duration-200"
                    placeholder="Enter owner's full name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-2">
                    Business Location *
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent hover:border-[#0AA5C0] transition-colors duration-200"
                    placeholder="e.g., Nairobi, Kenya"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="businessType" className="block text-sm font-medium text-gray-300 mb-2">
                    Business Type *
                  </label>
                  <select
                    id="businessType"
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent hover:border-[#0AA5C0] transition-colors duration-200"
                    required
                  >
                    <option value="">Select business type</option>
                    {businessTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent hover:border-[#0AA5C0] transition-colors duration-200"
                    placeholder="+254712345678"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    This number will be used for OTP verification
                  </p>
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
                  disabled={loading}
                  className="w-full py-4 px-6 bg-[#0795B0] hover:bg-[#0684A0] text-white rounded-lg font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0795B0] disabled:opacity-50 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Building size={20} className="mr-2" />
                      Create Business Account
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-900/20 border border-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building size={32} className="text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Enter Verification Code</h3>
                  <p className="text-gray-300">
                    Check your server logs for the OTP sent to <span className="text-white font-medium">{formData.phoneNumber}</span>
                  </p>
                  <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-500 rounded-lg">
                    <p className="text-sm text-yellow-300">
                      💡 <strong>Developer Note:</strong> OTP is logged in server console for testing purposes
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-300 mb-2">
                    Verification Code *
                  </label>
                  <div className="relative">
                    <input
                      type={showOtp ? "text" : "password"}
                      id="otp"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full px-4 py-3 bg-[#1A1E1E] border border-[#0795B0] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0795B0] focus:border-transparent hover:border-[#0AA5C0] transition-colors duration-200 text-center text-2xl tracking-widest"
                      placeholder="000000"
                      maxLength={6}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowOtp(!showOtp)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showOtp ? <EyeSlash size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    Enter the 6-digit code from server logs
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg">
                    <div className="flex items-center">
                      <Warning size={20} className="text-red-400 mr-2" />
                      <p className="text-red-300 text-sm">{error}</p>
                    </div>
                  </div>
                )}

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setStep('form')}
                    className="flex-1 py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="flex-1 py-3 px-4 bg-[#0795B0] hover:bg-[#0684A0] text-white rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0795B0] disabled:opacity-50 transition-all duration-200 flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Verifying...
                      </>
                    ) : (
                      'Verify & Create'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </article>
    </section>
  );
};
