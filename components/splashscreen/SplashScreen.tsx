"use client";

import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import DotPayLogo from "@/components/brand/DotPayLogo";

const SPLASH_DURATION_MS = 1000;

const SplashScreen = () => {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace("/onboarding");
    }, SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <section className="app-background min-h-screen flex items-center justify-center">
      <DotPayLogo size={72} />
    </section>
  );
};

export default SplashScreen;
