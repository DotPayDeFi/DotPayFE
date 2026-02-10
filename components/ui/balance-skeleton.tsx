import React from 'react';

export const BalanceSkeleton = () => {
  return (
    <div className="text-center animate-pulse">
      {/* KES Amount Skeleton */}
      <div className="h-12 bg-gray-700 rounded-lg mb-3 mx-auto w-64"></div>
      
      {/* USD Amount Skeleton */}
      <div className="h-6 bg-gray-700 rounded-lg mb-3 mx-auto w-32"></div>
      
      {/* Exchange Rate Skeleton */}
      <div className="h-4 bg-gray-700 rounded-lg mb-4 mx-auto w-48"></div>
      
      {/* Chain Balances Skeleton */}
      <div className="w-full max-w-md mx-auto">
        <div className="h-6 bg-gray-700 rounded-lg mb-2 w-24 mx-auto"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-700 rounded-lg w-32 mx-auto"></div>
          <div className="h-4 bg-gray-700 rounded-lg w-28 mx-auto"></div>
          <div className="h-4 bg-gray-700 rounded-lg w-36 mx-auto"></div>
        </div>
      </div>
    </div>
  );
};

export const BalanceErrorState = ({ error, onRetry }: { error: string; onRetry: () => void }) => {
  return (
    <div className="text-center">
      <div className="text-red-400 mb-4">
        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="text-sm">{error}</p>
      </div>
      <button
        onClick={onRetry}
        className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200"
      >
        Retry
      </button>
    </div>
  );
};

export const BalanceEmptyState = () => {
  return (
    <div className="text-center">
      <div className="text-gray-400 mb-4">
        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <h1 className="text-2xl text-white font-bold mb-2">No Balance</h1>
        <p className="text-sm">Your wallet appears to be empty</p>
      </div>
    </div>
  );
};
