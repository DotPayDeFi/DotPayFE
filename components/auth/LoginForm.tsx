// Deprecated legacy login form – kept as a placeholder to avoid breaking imports.
// New auth is handled via ThirdwebConnectButton and thirdweb auth flows.

"use client";

import React from "react";

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md text-center">
      <h2 className="text-2xl font-bold mb-4">Login</h2>
      <p className="text-gray-600 mb-4">
        Login is now handled via the main DotPay interface using wallet-based authentication.
      </p>
      {onSwitchToRegister && (
        <button
          onClick={onSwitchToRegister}
          className="text-blue-600 hover:text-blue-500 font-medium text-sm"
        >
          Go to registration
        </button>
      )}
    </div>
  );
};