"use client";

import React from "react";
import { useWallet } from "@/context/WalletContext";
import WalletOverview from "./WalletOverview";

const WalletDashboard: React.FC = () => {
  const { 
    wallet, 
    balance,
    loading, 
    refreshing, 
    refreshWallet, 
    formatBalance, 
    formatUSD 
  } = useWallet();

  if (loading && !wallet) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading wallet...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Wallet Dashboard</h1>
        <button
          onClick={refreshWallet}
          disabled={refreshing}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {wallet || balance ? (
        <div className="space-y-6">
          {/* Wallet Overview Component */}
          <WalletOverview />

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="bg-green-500 text-white p-4 rounded-lg hover:bg-green-600 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">💸</div>
                <div className="font-medium">Send</div>
              </div>
            </button>
            <button className="bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-600 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">📱</div>
                <div className="font-medium">M-Pesa</div>
              </div>
            </button>
            <button className="bg-purple-500 text-white p-4 rounded-lg hover:bg-purple-600 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">💰</div>
                <div className="font-medium">Liquidity</div>
              </div>
            </button>
            <button className="bg-orange-500 text-white p-4 rounded-lg hover:bg-orange-600 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">📊</div>
                <div className="font-medium">History</div>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No wallet data available</p>
          <button
            onClick={refreshWallet}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Load Wallet
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletDashboard;