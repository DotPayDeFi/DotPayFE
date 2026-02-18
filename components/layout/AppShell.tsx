"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { BottomTabBar } from "@/components/layout/BottomTabBar";

function shouldShowTabs(pathname: string) {
  const p = pathname || "/";
  if (
    p === "/" ||
    p.startsWith("/onboarding") ||
    p.startsWith("/login") ||
    p.startsWith("/signup") ||
    p.startsWith("/auth") ||
    p.startsWith("/offline")
  ) {
    return false;
  }

  // Show tabs for the main consumer wallet surfaces.
  return (
    p === "/home" ||
    p.startsWith("/send") ||
    p.startsWith("/pay") ||
    p.startsWith("/add-funds") ||
    p.startsWith("/receive") ||
    p.startsWith("/activity") ||
    p.startsWith("/settings")
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const showTabs = useMemo(() => shouldShowTabs(pathname), [pathname]);

  return (
    <div className={showTabs ? "pb-[calc(92px+env(safe-area-inset-bottom))]" : ""}>
      {children}
      {showTabs && <BottomTabBar />}
    </div>
  );
}

