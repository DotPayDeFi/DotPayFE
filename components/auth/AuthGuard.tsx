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
      <div className="min-h-screen bg-app-bg bg-cover bg-center bg-no-repeat flex items-center justify-center px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-200/70 border-t-transparent" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
