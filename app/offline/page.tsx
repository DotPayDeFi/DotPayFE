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
    <main className="min-h-screen bg-app-bg bg-cover bg-center bg-no-repeat flex items-center justify-center p-4 text-white">
      <section className="max-w-md w-full text-center rounded-2xl border border-white/10 bg-black/40 p-8">
        <div className="w-20 h-20 rounded-full border border-white/15 bg-white/5 flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-white/80" />
        </div>

        <h1 className="text-2xl font-bold">You&apos;re offline</h1>
        <p className="mt-2 text-sm text-white/70 leading-relaxed">
          Check your connection and try again. DotPay needs internet access to update your balance and confirm payments.
        </p>

        <div className="mt-6 space-y-3">
          <Button
            onClick={handleRefresh}
            className="w-full bg-[#0795B0] hover:bg-[#0795B0]/90 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
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

        <p className="mt-6 text-xs text-white/55">
          Tip: Install the app for faster access on your phone.
        </p>
      </section>
    </main>
  );
};

export default OfflinePage;
