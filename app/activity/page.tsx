"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuthSession } from "@/context/AuthSessionContext";
import { useKesRate } from "@/hooks/useKesRate";
import { useOnchainActivity, type OnchainTransfer } from "@/hooks/useOnchainActivity";
import { mpesaClient } from "@/lib/mpesa-client";
import { isBackendApiConfigured } from "@/lib/backendUser";
import { getDotPayNetwork } from "@/lib/dotpayNetwork";
import { formatKsh, shortHash } from "@/lib/format";
import { MpesaTransaction } from "@/types/mpesa";
import { cn } from "@/lib/utils";

const HIDE_BALANCES_KEY = "dotpay_hide_balances";

type Filter =
  | "all"
  | "sent"
  | "received"
  | "cashout"
  | "paybill"
  | "till"
  | "topup";

type UiStatus = {
  label: string;
  tone: "success" | "danger" | "neutral";
};

type ActivityItem = {
  id: string;
  kind: "mpesa" | "transfer";
  category: Exclude<Filter, "all">;
  title: string;
  subtitle: string;
  amountKes: number | null;
  direction: "+" | "-";
  status: UiStatus;
  createdAt: string | null;
  snapshot: any;
};

function statusForMpesa(tx: MpesaTransaction): UiStatus {
  if (tx.status === "succeeded") return { label: "Completed", tone: "success" };
  if (tx.status === "refunded") return { label: "Refunded", tone: "neutral" };
  if (tx.status === "failed") return { label: "Failed", tone: "danger" };
  if (tx.status === "refund_pending") return { label: "Refunding", tone: "neutral" };
  return { label: "Processing", tone: "neutral" };
}

function statusForTransfer(): UiStatus {
  return { label: "Completed", tone: "success" };
}

function maskPhone(phone: string) {
  const digits = String(phone || "").replace(/[^0-9]/g, "");
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 4)}***${digits.slice(-3)}`;
}

function kshText(amount: number | null, direction: "+" | "-") {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "KSh —";
  return `${direction}${formatKsh(amount)}`;
}

function classifyMpesa(tx: MpesaTransaction): Exclude<Filter, "all"> {
  if (tx.flowType === "onramp") return "topup";
  if (tx.flowType === "offramp") return "cashout";
  if (tx.flowType === "paybill") return "paybill";
  return "till";
}

function titleForMpesa(tx: MpesaTransaction) {
  if (tx.flowType === "onramp") return "Top up";
  if (tx.flowType === "offramp") return "Cash out";
  if (tx.flowType === "paybill") return "PayBill";
  return "Till payment";
}

function subtitleForMpesa(tx: MpesaTransaction) {
  if (tx.flowType === "onramp") {
    return tx.targets.phoneNumber ? `From M-Pesa ${maskPhone(tx.targets.phoneNumber)}` : "From M-Pesa";
  }
  if (tx.flowType === "offramp") {
    return tx.targets.phoneNumber ? `To M-Pesa ${maskPhone(tx.targets.phoneNumber)}` : "To M-Pesa";
  }
  if (tx.flowType === "paybill") {
    const pb = tx.targets.paybillNumber ? `PayBill ${tx.targets.paybillNumber}` : "PayBill";
    const ref = tx.targets.accountReference ? `Ref ${tx.targets.accountReference}` : null;
    return [pb, ref].filter(Boolean).join(" · ");
  }
  const till = tx.targets.tillNumber ? `Till ${tx.targets.tillNumber}` : "Till";
  const ref = tx.targets.accountReference ? tx.targets.accountReference : null;
  return [till, ref].filter(Boolean).join(" · ");
}

function directionAndAmountMpesa(tx: MpesaTransaction): { direction: "+" | "-"; amount: number } {
  if (tx.flowType === "onramp") return { direction: "+", amount: tx.quote.expectedReceiveKes };
  return { direction: "-", amount: tx.quote.totalDebitKes };
}

function shortAddress(addr: string) {
  return shortHash(addr, 4);
}

function transferCategory(transfer: OnchainTransfer, me: string): Exclude<Filter, "all"> {
  const from = transfer.from.trim().toLowerCase();
  const to = transfer.to.trim().toLowerCase();
  const mine = me.trim().toLowerCase();
  if (from === mine && to !== mine) return "sent";
  if (to === mine && from !== mine) return "received";
  return "sent";
}

function transferDirection(transfer: OnchainTransfer, me: string): "+" | "-" {
  const from = transfer.from.trim().toLowerCase();
  const to = transfer.to.trim().toLowerCase();
  const mine = me.trim().toLowerCase();
  if (from === mine && to !== mine) return "-";
  return "+";
}

function unitsToNumber(value: string, decimals: number): number | null {
  const clean = String(value || "0").trim().replace(/^0+/, "") || "0";
  const d = Number.isFinite(decimals) ? Math.max(0, Math.min(decimals, 18)) : 6;
  const padded = clean.padStart(d + 1, "0");
  const intPart = padded.slice(0, -d);
  const fracPartRaw = padded.slice(-d);
  const fracPart = fracPartRaw.replace(/0+$/, "");
  const numStr = fracPart.length ? `${intPart}.${fracPart}` : intPart;
  const n = Number(numStr);
  return Number.isFinite(n) ? n : null;
}

function transferTitle(transfer: OnchainTransfer, me: string) {
  const cat = transferCategory(transfer, me);
  return cat === "received" ? "Received" : "Sent";
}

function transferSubtitle(transfer: OnchainTransfer, me: string) {
  const mine = me.trim().toLowerCase();
  const from = transfer.from.trim().toLowerCase();
  const to = transfer.to.trim().toLowerCase();
  const counterparty = from === mine ? transfer.to : transfer.from;
  return `${from === mine ? "To" : "From"} ${shortAddress(counterparty)}`;
}

const StatusPill = ({ status }: { status: UiStatus }) => {
  const cls =
    status.tone === "success"
      ? "border-cyan-300/25 bg-cyan-500/10 text-cyan-100"
      : status.tone === "danger"
        ? "border-red-300/25 bg-red-500/10 text-red-100"
        : "border-white/10 bg-white/5 text-white/75";

  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", cls)}>
      {status.label}
    </span>
  );
};

function BlurredValue({
  hidden,
  className,
  children,
}: {
  hidden: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("relative inline-flex items-center", hidden && "select-none", className)}>
      <span className={cn("relative z-10 transition", hidden && "blur-md opacity-70")}>
        {children}
      </span>
      {hidden && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/15"
        />
      )}
    </span>
  );
}

export default function ActivityPage() {
  const router = useRouter();
  const { address, sessionUser } = useAuthSession();
  const sessionAddress = useMemo(
    () => (sessionUser?.address || "").trim().toLowerCase() || null,
    [sessionUser?.address]
  );
  const onchainAddress = useMemo(
    () => (address || sessionAddress || "").trim().toLowerCase() || null,
    [address, sessionAddress]
  );
  const network = getDotPayNetwork();
  const backendConfigured = isBackendApiConfigured();

  const [filter, setFilter] = useState<Filter>("all");
  const [hideBalances, setHideBalances] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHideBalances(window.localStorage.getItem(HIDE_BALANCES_KEY) === "1");
  }, []);

  const { data: kesRate } = useKesRate();
  const kesPerUsd = kesRate?.kesPerUsd ?? 155;

  const onchainQuery = useOnchainActivity({ address: onchainAddress, network, limit: 25 });

  const mpesaQuery = useQuery<MpesaTransaction[]>({
    queryKey: ["mpesa", "transactions", 50],
    enabled: backendConfigured,
    queryFn: async () => {
      const res = await mpesaClient.listTransactions({ limit: 50 });
      return Array.isArray(res.data?.transactions) ? res.data.transactions : [];
    },
    staleTime: 15 * 1000,
    retry: 1,
  });

  const items = useMemo<ActivityItem[]>(() => {
    const out: ActivityItem[] = [];

    if (Array.isArray(mpesaQuery.data)) {
      for (const tx of mpesaQuery.data) {
        const cat = classifyMpesa(tx);
        const { direction, amount } = directionAndAmountMpesa(tx);
        out.push({
          id: tx.transactionId,
          kind: "mpesa",
          category: cat,
          title: titleForMpesa(tx),
          subtitle: subtitleForMpesa(tx),
          amountKes: amount,
          direction,
          status: statusForMpesa(tx),
          createdAt: tx.updatedAt || tx.createdAt || null,
          snapshot: { kind: "mpesa", tx },
        });
      }
    }

    if (onchainAddress && Array.isArray(onchainQuery.data)) {
      for (const t of onchainQuery.data) {
        const amountUsdc = unitsToNumber(t.value, t.tokenDecimal);
        const kesAmount = typeof amountUsdc === "number" ? amountUsdc * kesPerUsd : null;
        out.push({
          id: t.hash,
          kind: "transfer",
          category: transferCategory(t, onchainAddress),
          title: transferTitle(t, onchainAddress),
          subtitle: transferSubtitle(t, onchainAddress),
          amountKes: kesAmount,
          direction: transferDirection(t, onchainAddress),
          status: statusForTransfer(),
          createdAt: t.timeStamp ? new Date(t.timeStamp * 1000).toISOString() : null,
          snapshot: { kind: "transfer", transfer: t, kesPerUsd },
        });
      }
    }

    return out.sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });
  }, [kesPerUsd, mpesaQuery.data, onchainAddress, onchainQuery.data]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.category === filter);
  }, [filter, items]);

  const handleOpen = useCallback(
    (item: ActivityItem) => {
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(`activity:${item.id}`, JSON.stringify(item.snapshot));
        }
      } catch {
        // ignore
      }
      router.push(`/activity/${item.id}`);
    },
    [router]
  );

  const refreshing = mpesaQuery.isFetching || onchainQuery.isFetching;

  return (
    <AuthGuard redirectTo="/onboarding">
      <main className="app-background min-h-screen px-4 pb-8 pt-6 text-white !items-stretch !justify-start">
        <section className="mx-auto w-full max-w-xl space-y-4">
          <header className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Activity</p>
              <h1 className="mt-1 text-2xl font-bold">Receipts</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setHideBalances((v) => {
                    const next = !v;
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem(HIDE_BALANCES_KEY, next ? "1" : "0");
                    }
                    return next;
                  })
                }
                className="rounded-2xl border border-white/15 bg-white/5 p-2.5 hover:bg-white/10"
                aria-label={hideBalances ? "Show balances" : "Hide balances"}
              >
                {hideBalances ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  mpesaQuery.refetch();
                  onchainQuery.refetch();
                }}
                className="rounded-2xl border border-white/15 bg-white/5 p-2.5 hover:bg-white/10"
                aria-label="Refresh"
              >
                <RefreshCw className={cn("h-5 w-5", refreshing ? "animate-spin" : "")} />
              </button>
            </div>
          </header>

          <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Activity filters">
            {(
              [
                { id: "all", label: "All" },
                { id: "sent", label: "Sent" },
                { id: "received", label: "Received" },
                { id: "cashout", label: "Cash out" },
                { id: "paybill", label: "PayBill" },
                { id: "till", label: "Till" },
                { id: "topup", label: "Top up" },
              ] as const
            ).map((t) => {
              const active = filter === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilter(t.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-2 text-xs font-semibold",
                    active
                      ? "border-cyan-300/35 bg-cyan-500/15 text-cyan-50"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </nav>

          {(mpesaQuery.isLoading || onchainQuery.isLoading) && filtered.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-white/70">
              Loading activity…
            </div>
          )}

          {(mpesaQuery.isError || onchainQuery.isError) && (
            <div className="rounded-2xl border border-amber-300/25 bg-amber-500/10 p-5">
              <p className="text-sm font-semibold text-amber-100">Some activity is unavailable</p>
              <p className="mt-1 text-xs text-amber-100/80">
                Try refreshing. If this keeps happening, check your connection or API keys.
              </p>
            </div>
          )}

          {filtered.length === 0 && !mpesaQuery.isLoading && !onchainQuery.isLoading && (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-white/70">
              No activity yet.
            </div>
          )}

          <div className="space-y-2">
            {filtered.map((item) => (
              <button
                key={`${item.kind}:${item.id}`}
                type="button"
                onClick={() => handleOpen(item)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <StatusPill status={item.status} />
                  </div>
                  <p className="mt-1 truncate text-xs text-white/60">{item.subtitle}</p>
                </div>
                <p
                  className={cn(
                    "shrink-0 text-sm font-semibold",
                    item.direction === "-" ? "text-white" : "text-cyan-100"
                  )}
                >
                  <BlurredValue hidden={hideBalances}>
                    {kshText(item.amountKes, item.direction)}
                  </BlurredValue>
                </p>
              </button>
            ))}
          </div>
        </section>
      </main>
    </AuthGuard>
  );
}
