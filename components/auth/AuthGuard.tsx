"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/context/AuthSessionContext";

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  redirectTo = "/login",
}) => {
  const { isLoggedIn, loading, hasChecked } = useAuthSession();
  const router = useRouter();

  useEffect(() => {
    if (hasChecked && !isLoggedIn) {
      router.replace(redirectTo);
    }
  }, [isLoggedIn, hasChecked, router, redirectTo]);

  if (!hasChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0795B0] border-t-transparent"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;