"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import { BuyCryptoForm } from "@/components/mpesa/BuyCryptoForm";
import { PayWithCryptoForm } from "@/components/mpesa/PayWithCryptoForm";
import { CryptoToMpesaForm } from "@/components/mpesa/CryptoToMpesaForm";

type MpesaTab = "buy" | "pay" | "withdraw";

const TAB_LABELS: Record<MpesaTab, string> = {
  buy: "Buy Crypto",
  pay: "Pay Bills/Till",
  withdraw: "Withdraw to M-Pesa",
};

function parseTab(value: string | null): MpesaTab {
  if (value === "pay") return "pay";
  if (value === "withdraw") return "withdraw";
  return "buy";
}

export default function MpesaPage() {
  const searchParams = useSearchParams();
  const activeTab = useMemo(() => parseTab(searchParams?.get("tab") ?? null), [searchParams]);

  return (
    <AuthGuard redirectTo="/onboarding">
      <main className="app-background min-h-screen px-4 py-6 text-white !items-stretch !justify-start">
        <section className="mx-auto w-full max-w-5xl space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">M-Pesa Flows</h1>
              <p className="mt-1 text-sm text-white/70">
                Login, fund onramp, pay paybill/till, and withdraw with live M-Pesa APIs.
              </p>
            </div>
            <Link
              href="/home"
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium hover:bg-white/10"
            >
              Back Home
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["buy", "pay", "withdraw"] as MpesaTab[]).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <Link
                  key={tab}
                  href={`/mpesa?tab=${tab}`}
                  className={
                    isActive
                      ? "rounded-full border border-cyan-300/40 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100"
                      : "rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
                  }
                >
                  {TAB_LABELS[tab]}
                </Link>
              );
            })}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            {activeTab === "buy" && <BuyCryptoForm />}
            {activeTab === "pay" && <PayWithCryptoForm />}
            {activeTab === "withdraw" && <CryptoToMpesaForm />}
          </div>
        </section>
      </main>
    </AuthGuard>
  );
}

