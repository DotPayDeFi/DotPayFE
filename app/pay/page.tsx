"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Landmark, Store } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";

export default function PayHomePage() {
  const router = useRouter();

  return (
    <AuthGuard redirectTo="/onboarding">
      <main className="app-background min-h-screen px-4 pb-8 pt-6 text-white !items-stretch !justify-start">
        <section className="mx-auto w-full max-w-xl space-y-4">
          <header>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Pay</p>
            <h1 className="mt-1 text-2xl font-bold">Pay with M-Pesa</h1>
            <p className="mt-2 text-sm text-white/70">
              Pay merchants using PayBill or Till numbers with a tracked receipt.
            </p>
          </header>

          <article className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-5">
            <button
              type="button"
              onClick={() => router.push("/pay/paybill")}
              className="group w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-cyan-100">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">PayBill</p>
                    <p className="mt-1 text-xs text-white/65">
                      Pay a business PayBill number with an account reference.
                    </p>
                  </div>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/55" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => router.push("/pay/till")}
              className="group w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-cyan-100">
                    <Store className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Till (Buy Goods)</p>
                    <p className="mt-1 text-xs text-white/65">
                      Pay a Till number at local merchants.
                    </p>
                  </div>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white/55" />
              </div>
            </button>
          </article>
        </section>
      </main>
    </AuthGuard>
  );
}
