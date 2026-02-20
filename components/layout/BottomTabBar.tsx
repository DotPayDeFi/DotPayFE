"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDownLeft, CreditCard, Home, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: "/home",
    label: "Home",
    icon: <Home className="h-5 w-5" />,
    isActive: (p) => p === "/home",
  },
  {
    href: "/send",
    label: "Send",
    icon: <Send className="h-5 w-5" />,
    isActive: (p) => p.startsWith("/send"),
  },
  {
    href: "/pay",
    label: "Pay",
    icon: <CreditCard className="h-5 w-5" />,
    isActive: (p) => p.startsWith("/pay"),
  },
  {
    href: "/add-funds",
    label: "Add Funds",
    icon: <ArrowDownLeft className="h-5 w-5" />,
    isActive: (p) => p.startsWith("/add-funds"),
  },
];

export function BottomTabBar() {
  const pathname = usePathname() || "/";

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-50",
        "border-t border-white/10 bg-[#0d141b]/90 backdrop-blur",
        "px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-3"
      )}
      aria-label="Primary"
    >
      <div className="mx-auto grid w-full max-w-xl grid-cols-4 gap-2">
        {TABS.map((tab) => {
          const active = tab.isActive(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2",
                active ? "bg-cyan-500/10 text-cyan-100" : "text-white/65 hover:bg-white/5"
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className={cn(active ? "text-cyan-100" : "text-white/65")}>
                {tab.icon}
              </span>
              <span className="text-[11px] font-semibold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

