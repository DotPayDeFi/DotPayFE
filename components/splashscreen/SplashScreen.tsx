"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { NexusLogo } from "../../constants/svg";

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
      <Image src={NexusLogo} alt="DotPay" priority />
    </section>
  );
};

export default SplashScreen;
