"use client";

import React from 'react';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const OfflinePage: React.FC = () => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E0E] to-[#1a1a1a] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          {/* Offline Icon */}
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <WifiOff className="w-10 h-10 text-red-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-4">
            You&apos;re Offline
          </h1>

          {/* Description */}
          <p className="text-gray-300 mb-8 leading-relaxed">
            It looks like you&apos;re not connected to the internet. Check your connection and try again.
          </p>

          {/* Features Available Offline */}
          <div className="bg-white/5 rounded-lg p-4 mb-8">
            <h3 className="text-white font-semibold mb-3">Available Offline:</h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• View cached transaction history</li>
              <li>• Access saved wallet information</li>
              <li>• Browse previously loaded pages</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleRefresh}
              className="w-full bg-[#0795B0] hover:bg-[#0795B0]/90 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>

            <Link href="/home">
              <Button
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Home
              </Button>
            </Link>
          </div>

          {/* Tips */}
          <div className="mt-8 text-xs text-gray-400">
            <p>Tip: Install the app for better offline experience</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflinePage;
