"use client";

import Image from "next/image";
import { NexusLogo } from "@/constants/svg";
import { cn } from "@/lib/utils";

type AuthHandoffProps = {
  title?: string;
  subtitle?: string;
  variant?: "app" | "onboarding";
  className?: string;
};

export default function AuthHandoff({
  title = "Signing you in...",
  subtitle = "This will only take a moment.",
  variant = "app",
  className,
}: AuthHandoffProps) {
  const bgClass = variant === "onboarding" ? "bg-onboarding-bg" : "bg-app-bg";

  return (
    <main
      className={cn(
        bgClass,
        "min-h-screen w-full bg-cover bg-center bg-no-repeat font-poppins text-white",
        "flex flex-col items-center justify-center px-4",
        className
      )}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <Image src={NexusLogo} alt="DotPay" className="h-auto w-36" priority />

        <div className="flex flex-col items-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-200/70 border-t-transparent" />
          <p className="mt-5 text-sm font-semibold tracking-wide">{title}</p>
          <p className="mt-1 text-xs text-white/65">{subtitle}</p>
        </div>
      </div>
    </main>
  );
}

