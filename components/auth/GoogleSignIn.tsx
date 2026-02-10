"use client";

import React from "react";

type GoogleSignInProps = {
  onSuccess?: (credential: string) => void;
  onError?: () => void;
};

const GoogleSignIn: React.FC<GoogleSignInProps> = ({ onSuccess, onError }) => {
  const handleClick = () => {
    try {
      // Legacy placeholder to keep old business signup UI compiling.
      if (onSuccess) onSuccess("mock_google_credential");
    } catch {
      if (onError) onError();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full rounded-md border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
    >
      Continue with Google
    </button>
  );
};

export default GoogleSignIn;

