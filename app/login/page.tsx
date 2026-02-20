// Login.tsx - Updated for production deployment
"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ThirdwebConnectButton } from "@/components/auth/ThirdwebConnectButton";
import Link from "next/link";
import { useAuthSession } from "@/context/AuthSessionContext";
import AuthHandoff from "@/components/auth/AuthHandoff";

const Login: React.FC = () => {
  const { isLoggedIn, hasChecked } = useAuthSession();
  const router = useRouter();

  useEffect(() => {
    if (hasChecked && isLoggedIn) {
      router.replace("/auth/finish?mode=login");
    }
  }, [hasChecked, isLoggedIn, router]);

  if (hasChecked && isLoggedIn) {
    return (
      <AuthHandoff
        variant="app"
        title="Signing you in"
        subtitle="Verifying your session..."
      />
    );
  }

  return (
    <section className="app-background flex flex-col items-center justify-center px-4">
      <article className="max-w-md w-full text-center">
        <h2 className="text-4xl text-white font-bold mb-4">Welcome to DotPay</h2>
        <p className="text-white mb-8">
          Continue with Google, Email or Phone.
        </p>
        <div className="flex justify-center mb-6">
          <ThirdwebConnectButton mode="login" />
        </div>
        <p className="text-[#909090] text-sm font-semibold mt-4">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="hover:text-white text-gray-300">
            Create one
          </Link>
        </p>
      </article>
    </section>
  );
};

export default Login;
