"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronRight,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  LogOut,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  UserCircle2,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import { getContract } from "thirdweb";
import { getBalance } from "thirdweb/extensions/erc20";
import { useConnectModal, useIsAutoConnecting } from "thirdweb/react";
import { useReadContract } from "thirdweb/react";
import AuthGuard from "@/components/auth/AuthGuard";
import DotPayLogo from "@/components/brand/DotPayLogo";
import { useAuthSession } from "@/context/AuthSessionContext";
import {
  getUserFromBackend,
  isBackendApiConfigured,
  syncUserToBackend,
  type BackendUserRecord,
} from "@/lib/backendUser";
import { thirdwebClient } from "@/lib/thirdwebClient";
import { getDotPayAccountAbstraction } from "@/lib/thirdwebAccountAbstraction";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DetailsDisclosure } from "@/components/ui/DetailsDisclosure";
import { useKesRate } from "@/hooks/useKesRate";
import { type OnchainTransfer, useOnchainActivity } from "@/hooks/useOnchainActivity";
import { getDotPayNetwork, getDotPaySupportedChains, getDotPayUsdcChain } from "@/lib/dotpayNetwork";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/useNotifications";
import { mpesaClient } from "@/lib/mpesa-client";
import { MpesaTransaction } from "@/types/mpesa";

// Circle's official USDC (proxy) on Arbitrum Sepolia.
// Source: Circle "USDC Contract Addresses" docs.
const USDC_ARBITRUM_SEPOLIA_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as const;

// Circle native USDC on Arbitrum One (mainnet).
const USDC_ARBITRUM_ONE_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as const;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const HIDE_BALANCES_KEY = "dotpay_hide_balances";

const formatCurrency = (value: number, currency: "USD" | "KES" = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

const shortAddress = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const formatTimeAgo = (isoLike: string | null | undefined) => {
  if (!isoLike) return "just now";
  const ts = new Date(isoLike).getTime();
  if (Number.isNaN(ts)) return "just now";

  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 30) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
};

const Skeleton = ({ className }: { className: string }) => (
  <div className={cn("animate-pulse rounded-lg bg-white/10", className)} />
);

const formatKesNumber = (value: number, maximumFractionDigits: number = 2) =>
  new Intl.NumberFormat("en-KE", {
    maximumFractionDigits,
  }).format(value);

const formatKes = (value: number) => `KSh ${formatKesNumber(value, 0)}`;

const formatUsdc = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

type ActivityItem = {
  id: string;
  kind: "mpesa" | "transfer";
  title: string;
  subtitle: string;
  amountText: string;
  direction: "+" | "-";
  status: "completed" | "pending" | "processing" | "failed" | "unknown";
  createdAt: string | null;
  snapshot?: any;
};

const unitsToNumber = (value: string, decimals: number): number | null => {
  const clean = String(value || "0").trim().replace(/^0+/, "") || "0";
  const d = Number.isFinite(decimals) ? Math.max(0, Math.min(decimals, 18)) : 6;

  if (d === 0) {
    const n = Number(clean);
    return Number.isFinite(n) ? n : null;
  }

  const padded = clean.padStart(d + 1, "0");
  const intPart = padded.slice(0, -d);
  const fracPartRaw = padded.slice(-d);
  const fracPart = fracPartRaw.replace(/0+$/, "");
  const numStr = fracPart.length ? `${intPart}.${fracPart}` : intPart;
  const n = Number(numStr);
  return Number.isFinite(n) ? n : null;
};

const activityFromTransfer = (
  transfer: OnchainTransfer,
  address: string,
  kesPerUsd?: number | null
): ActivityItem => {
  const me = address.trim().toLowerCase();
  const from = transfer.from.trim().toLowerCase();
  const to = transfer.to.trim().toLowerCase();

  const isSelf = from === me && to === me;
  const outgoing = from === me && to !== me;
  const incoming = to === me && from !== me;

  const direction: "+" | "-" = outgoing ? "-" : "+";
  const title = isSelf ? "Transfer" : outgoing ? "Sent" : incoming ? "Received" : "Payment";
  const counterparty = outgoing ? transfer.to : transfer.from;
  const createdAt = transfer.timeStamp ? new Date(transfer.timeStamp * 1000).toISOString() : null;

  const token = transfer.tokenSymbol || "USDC";
  const amount = unitsToNumber(transfer.value, transfer.tokenDecimal);
  const rate = typeof kesPerUsd === "number" ? kesPerUsd : 155;
  const kesAmount = typeof amount === "number" ? amount * rate : null;

  const amountText =
    typeof kesAmount === "number" && Number.isFinite(kesAmount)
      ? `${direction}${formatKes(kesAmount)}`
      : `${direction}${token}`;

  const subtitle = isSelf
    ? `Self • ${formatTimeAgo(createdAt)}`
    : `${outgoing ? "To" : "From"} ${shortAddress(counterparty)} • ${formatTimeAgo(createdAt)}`;

  return {
    id: transfer.hash || `${transfer.blockNumber}:${transfer.timeStamp}`,
    kind: "transfer",
    title,
    subtitle,
    amountText,
    direction,
    status: "completed",
    createdAt,
    snapshot: { kind: "transfer", transfer, kesPerUsd: typeof kesPerUsd === "number" ? kesPerUsd : undefined },
  };
};

function statusFromMpesa(tx: MpesaTransaction): ActivityItem["status"] {
  if (tx.status === "succeeded") return "completed";
  if (tx.status === "failed") return "failed";
  if (tx.status === "refunded") return "completed";
  return "processing";
}

function maskPhone(phone: string) {
  const digits = String(phone || "").replace(/[^0-9]/g, "");
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 4)}***${digits.slice(-3)}`;
}

function titleFromMpesa(tx: MpesaTransaction) {
  if (tx.flowType === "onramp") return "Top up";
  if (tx.flowType === "offramp") return "Cash out";
  if (tx.flowType === "paybill") return "PayBill";
  return "Till payment";
}

function subtitleFromMpesa(tx: MpesaTransaction) {
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

function activityFromMpesa(tx: MpesaTransaction): ActivityItem {
  const isCredit = tx.flowType === "onramp";
  const direction: ActivityItem["direction"] = isCredit ? "+" : "-";
  const amount = isCredit ? tx.quote.expectedReceiveKes : tx.quote.totalDebitKes;
  const amountText = `${direction}${formatKes(amount)}`;

  return {
    id: tx.transactionId,
    kind: "mpesa",
    title: titleFromMpesa(tx),
    subtitle: subtitleFromMpesa(tx),
    amountText,
    direction,
    status: statusFromMpesa(tx),
    createdAt: tx.updatedAt || tx.createdAt || null,
    snapshot: { kind: "mpesa", tx },
  };
}

const StatusPill = ({ status }: { status: ActivityItem["status"] }) => {
  const label =
    status === "completed"
      ? "Completed"
      : status === "pending"
        ? "Pending"
        : status === "processing"
          ? "Processing"
          : status === "failed"
            ? "Failed"
            : "Unknown";

  const cls =
    status === "completed"
      ? "border-cyan-300/25 bg-cyan-500/10 text-cyan-100"
      : status === "failed"
        ? "border-red-300/25 bg-red-500/10 text-red-100"
        : "border-white/10 bg-white/5 text-white/75";

  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", cls)}>
      {label}
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

export default function HomePage() {
  const router = useRouter();
  const { address, sessionUser } = useAuthSession();

  const dotpayNetwork = getDotPayNetwork();
  const network = dotpayNetwork;

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hideBalances, setHideBalances] = useState(false);
  const [showReconnectCta, setShowReconnectCta] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHideBalances(window.localStorage.getItem(HIDE_BALANCES_KEY) === "1");
  }, []);

  const backendConfigured = isBackendApiConfigured();
  const sessionAddress = useMemo(
    () => (sessionUser?.address || "").trim().toLowerCase() || null,
    [sessionUser?.address]
  );
  const onchainAddress = useMemo(
    () => (address || sessionAddress || "").trim().toLowerCase() || null,
    [address, sessionAddress]
  );
  const profileAddress = useMemo(
    () => sessionAddress || onchainAddress || null,
    [onchainAddress, sessionAddress]
  );
  const hasActiveConnection = Boolean(address);

  const {
    data: kesRate,
    isLoading: kesRateLoading,
    isFetching: kesRateFetching,
    refetch: refetchKesRate,
  } = useKesRate();
  const kesPerUsd = kesRate?.kesPerUsd ?? null;

  const [backendStatus, setBackendStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [backendUser, setBackendUser] = useState<BackendUserRecord | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  const loadBackendProfile = useCallback(
    async (options?: { syncIfMissing?: boolean }) => {
      if (!backendConfigured) {
        setBackendStatus("ready");
        setBackendUser(null);
        setBackendError(null);
        return null;
      }

      if (!profileAddress) {
        setBackendStatus("ready");
        setBackendUser(null);
        setBackendError("No address found in your current session.");
        return null;
      }

      setBackendStatus("loading");
      setBackendError(null);

      try {
        let user = await getUserFromBackend(profileAddress);
        if (!user && options?.syncIfMissing !== false && sessionUser) {
          await syncUserToBackend(sessionUser);
          user = await getUserFromBackend(profileAddress);
        }
        setBackendUser(user);
        setBackendStatus("ready");
        return user;
      } catch {
        setBackendUser(null);
        setBackendStatus("error");
        setBackendError("Unable to load your profile right now.");
        return null;
      }
    },
    [backendConfigured, profileAddress, sessionUser]
  );

  useEffect(() => {
    loadBackendProfile({ syncIfMissing: true });
  }, [loadBackendProfile]);

  const activityQuery = useOnchainActivity({
    address: onchainAddress,
    network,
    limit: 12,
  });

  const mpesaRecentQuery = useQuery<MpesaTransaction[]>({
    queryKey: ["mpesa", "transactions", "home", 10],
    enabled: backendConfigured,
    queryFn: async () => {
      const res = await mpesaClient.listTransactions({ limit: 10 });
      const txs = res?.data?.transactions;
      return Array.isArray(txs) ? txs : [];
    },
    staleTime: 15 * 1000,
    retry: 1,
  });

  const activity = useMemo(() => {
    const out: ActivityItem[] = [];

    if (backendConfigured && Array.isArray(mpesaRecentQuery.data)) {
      for (const tx of mpesaRecentQuery.data) {
        out.push(activityFromMpesa(tx));
      }
    }

    if (onchainAddress && Array.isArray(activityQuery.data)) {
      for (const t of activityQuery.data) {
        // Onchain transfers typically include a hash; skip anything that can't render a receipt.
        if (!t?.hash) continue;
        out.push(activityFromTransfer(t, onchainAddress, kesPerUsd));
      }
    }

    return out
      .sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      })
      .slice(0, 5);
  }, [activityQuery.data, backendConfigured, kesPerUsd, mpesaRecentQuery.data, onchainAddress]);

  const chain = getDotPayUsdcChain(dotpayNetwork);
  const usdcAddress = dotpayNetwork === "sepolia" ? USDC_ARBITRUM_SEPOLIA_ADDRESS : USDC_ARBITRUM_ONE_ADDRESS;

  const usdcContract = useMemo(
    () =>
      getContract({
        client: thirdwebClient,
        chain,
        address: usdcAddress,
      }),
    [chain, usdcAddress]
  );

  const {
    data: usdcBalance,
    isLoading: usdcBalanceLoading,
    isFetching: usdcBalanceFetching,
    error: usdcBalanceError,
    refetch: refetchUsdcBalance,
  } = useReadContract(getBalance, {
    contract: usdcContract,
    address: onchainAddress ?? ZERO_ADDRESS,
    queryOptions: {
      enabled: Boolean(onchainAddress),
    },
  });

  const usdcAmount = useMemo(() => {
    const raw = usdcBalance?.displayValue;
    if (!raw) return null;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : null;
  }, [usdcBalance?.displayValue]);
  const totalKes = useMemo(() => {
    if (typeof usdcAmount !== "number") return null;
    const rate = typeof kesPerUsd === "number" ? kesPerUsd : 155; // safe fallback
    return usdcAmount * rate;
  }, [kesPerUsd, usdcAmount]);

  const totalUsd = usdcAmount;

  const greetingName =
    backendUser?.username ||
    sessionUser?.email?.split("@")[0] ||
    sessionUser?.phone ||
    "there";
  const greetingPrefix = getTimeGreeting();

  const dotpayId = useMemo(() => {
    const value = backendUser?.dotpayId;
    return value ? String(value).trim().toUpperCase() : null;
  }, [backendUser?.dotpayId]);

  const showIdentityCta =
    backendConfigured &&
    backendStatus === "ready" &&
    Boolean(profileAddress) &&
    !dotpayId;

  const { connect, isConnecting } = useConnectModal();
  const isAutoConnecting = useIsAutoConnecting();
  const defaultChain = useMemo(() => getDotPayUsdcChain(dotpayNetwork), [dotpayNetwork]);
  const supportedChains = useMemo(() => getDotPaySupportedChains(dotpayNetwork), [dotpayNetwork]);
  const accountAbstraction = useMemo(
    () => getDotPayAccountAbstraction(defaultChain),
    [defaultChain]
  );

  // Avoid UI flicker on refresh: auto-connect can complete quickly, so we only show the
  // reconnect CTA if the wallet is still disconnected after a short grace period.
  useEffect(() => {
    if (hasActiveConnection) {
      setShowReconnectCta(false);
      return;
    }

    if (isAutoConnecting) {
      setShowReconnectCta(false);
      return;
    }

    const t = setTimeout(() => setShowReconnectCta(true), 650);
    return () => clearTimeout(t);
  }, [hasActiveConnection, isAutoConnecting]);

  const handleReconnect = useCallback(async () => {
    try {
      const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
      await connect({
        client: thirdwebClient,
        chain: defaultChain,
        chains: supportedChains,
        accountAbstraction,
        wallets: undefined,
        recommendedWallets: undefined,
        showAllWallets: false,
        appMetadata: {
          name: "DotPay",
          url: "https://app.dotpay.xyz",
          description: "Mobile wallet for fast payments and clear receipts.",
          logoUrl: "https://app.dotpay.xyz/icons/icon-192x192.png",
        },
        theme: "dark",
        size: "compact",
        title: "Reconnect",
        walletConnect: walletConnectProjectId ? { projectId: walletConnectProjectId } : undefined,
      });
      toast.success("Account reconnected");
    } catch {
      toast.error("Connection not completed");
    }
  }, [accountAbstraction, connect, defaultChain, supportedChains]);

  const handleRefresh = useCallback(() => {
    refetchUsdcBalance();
    refetchKesRate();
    loadBackendProfile({ syncIfMissing: true });
    activityQuery.refetch();
    if (backendConfigured) {
      mpesaRecentQuery.refetch();
    }
  }, [
    activityQuery.refetch,
    backendConfigured,
    loadBackendProfile,
    mpesaRecentQuery.refetch,
    refetchKesRate,
    refetchUsdcBalance,
  ]);

  const handleOpenReceipt = useCallback(
    (item: ActivityItem) => {
      try {
        if (typeof window !== "undefined" && item.snapshot) {
          window.sessionStorage.setItem(`activity:${item.id}`, JSON.stringify(item.snapshot));
        }
      } catch {
        // ignore
      }
      router.push(`/activity/${encodeURIComponent(item.id)}`);
    },
    [router]
  );

  const notificationsQuery = useNotifications({ limit: 25, enabled: backendConfigured });
  const markAllRead = useMarkAllNotificationsRead();
  const markOneRead = useMarkNotificationRead();
  const unreadNotifications = notificationsQuery.data?.unreadCount ?? 0;
  const notifications = notificationsQuery.data?.notifications ?? [];

  return (
    <AuthGuard redirectTo="/onboarding">
      <main className="app-background !h-auto min-h-screen px-4 pb-8 pt-6 text-white !items-stretch !justify-start">
        <section className="mx-auto w-full max-w-5xl space-y-4">
          <header className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <DotPayLogo size={30} className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">{greetingPrefix}</p>
                <p className="mt-0.5 whitespace-normal break-words text-base font-semibold text-white">
                  {greetingName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNotificationsOpen(true)}
                className="relative rounded-2xl border border-white/15 bg-white/5 p-2.5 hover:bg-white/10"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-cyan-200 ring-2 ring-[#0d141b]" />
                )}
              </button>
              <button
                type="button"
                onClick={() => router.push("/settings")}
                className="rounded-2xl border border-cyan-300/35 bg-cyan-500/10 p-2.5 hover:bg-cyan-500/20"
                aria-label="Settings"
              >
                <UserCircle2 className="h-5 w-5" />
              </button>
            </div>
          </header>

          {showReconnectCta && !hasActiveConnection && (
            <article className="rounded-2xl border border-white/10 bg-black/35 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl border border-cyan-300/25 bg-cyan-500/10 p-2 text-cyan-100">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Reconnect to send payments</p>
                  <p className="mt-1 text-xs text-white/65">
                    You&apos;re signed in, but you need to reconnect securely before you can send.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReconnect}
                  disabled={isConnecting || isAutoConnecting}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-500/25 disabled:opacity-60"
                >
                  {(isConnecting || isAutoConnecting) && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}
                  Reconnect
                </button>
              </div>
            </article>
          )}

          {showIdentityCta && (
            <article className="rounded-2xl border border-cyan-300/25 bg-gradient-to-r from-cyan-500/15 to-sky-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl border border-cyan-300/25 bg-black/20 p-2 text-cyan-100">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Activate your DotPay ID</p>
                  <p className="mt-1 text-xs text-white/65">
                    Set a username for confirmation. Your DotPay ID (DP...) will be created automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/onboarding/identity")}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/10"
                >
                  Set up
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          )}

          <article className="relative overflow-hidden rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-[#081a22] via-[#0b3c4f] to-[#0f6678] p-5 shadow-[0_16px_40px_rgba(8,150,176,0.22)]">
            <div className="absolute -left-24 -top-20 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="absolute -bottom-28 -right-24 h-64 w-64 rounded-full bg-sky-300/10 blur-3xl" />

            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/80">
                  Available balance
                </p>

                <div className="mt-2">
                  {typeof totalKes === "number" ? (
                    <p className="text-4xl font-bold leading-none">
                      <BlurredValue hidden={hideBalances}>
                        {formatKes(totalKes)}
                      </BlurredValue>
                    </p>
                  ) : usdcBalanceError ? (
                    <p className="text-sm text-white/75">Balance unavailable</p>
                  ) : !onchainAddress ? (
                    <p className="text-sm text-white/75">Reconnect to view balance</p>
                  ) : (
                    <Skeleton className="h-10 w-64" />
                  )}

                  <div className="mt-3 flex flex-col gap-1.5 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      {typeof totalUsd === "number" ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-white/55">USD balance</span>
                          <BlurredValue hidden={hideBalances}>
                            <span className="text-white/80">{formatUsdc(totalUsd)} USD</span>
                          </BlurredValue>
                        </span>
                      ) : usdcBalanceError ? (
                        <span className="text-white/60">Balance unavailable</span>
                      ) : onchainAddress ? (
                        <Skeleton className="h-4 w-24" />
                      ) : (
                        <span className="text-white/60">—</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {typeof kesPerUsd === "number" ? (
                        <>
                          <span className="text-white/55">Exchange rate</span>
                          <BlurredValue hidden={hideBalances}>
                            <span className="text-white/80">
                              1 USD ≈ KSh {formatKesNumber(kesPerUsd, 2)}
                            </span>
                          </BlurredValue>
                        </>
                      ) : kesRateLoading ? (
                        <span className="text-white/60">Updating rate…</span>
                      ) : (
                        <span className="text-white/60">Rate unavailable</span>
                      )}
                    </div>
                  </div>

                  <DetailsDisclosure label="Details" className="mt-4 bg-black/20">
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-white/65">Token</span>
                        <span className="text-white/80">USDC</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-white/65">USDC balance</span>
                        <span className="text-white/80">
                          <BlurredValue hidden={hideBalances}>
                            {typeof totalUsd === "number" ? `${formatUsdc(totalUsd)} USDC` : "—"}
                          </BlurredValue>
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-white/65">Network</span>
                        <span className="text-white/80">
                          {dotpayNetwork === "sepolia" ? "Arbitrum Sepolia" : "Arbitrum One"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-white/65">Wallet in use</span>
                        <span className="font-mono text-white/80">
                          {onchainAddress ? shortAddress(onchainAddress) : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-white/65">Contract</span>
                        <span className="font-mono text-white/80">{shortAddress(usdcAddress)}</span>
                      </div>
                    </div>
                  </DetailsDisclosure>
                </div>
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
                  onClick={handleRefresh}
                  className="rounded-2xl border border-white/15 bg-white/5 p-2.5 hover:bg-white/10"
                  aria-label="Refresh"
                >
                  <RefreshCw
                    className={cn(
                      "h-5 w-5",
                      usdcBalanceFetching ||
                        kesRateFetching ||
                        backendStatus === "loading" ||
                        activityQuery.isFetching ||
                        (backendConfigured && mpesaRecentQuery.isFetching)
                        ? "animate-spin"
                        : ""
                    )}
                  />
                </button>
              </div>
            </div>

          </article>

          <div className="grid grid-cols-1 gap-4">
            <article className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">
                    Quick actions
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">Shortcuts</h2>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {(
                  [
                    {
                      id: "cashout",
                      label: "Cash out",
                      hint: "To M-Pesa",
                      icon: <ArrowUpRight className="h-6 w-6" />,
                      onClick: () => router.push("/send?mode=cashout"),
                      tone:
                        "border-emerald-300/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15",
                    },
                    {
                      id: "topup",
                      label: "Top up",
                      hint: "From M-Pesa",
                      icon: <ArrowDownLeft className="h-6 w-6" />,
                      onClick: () => router.push("/add-funds?tab=topup"),
                      tone: "border-cyan-300/25 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15",
                    },
                    {
                      id: "send_dotpay",
                      label: "Send",
                      hint: "Via DotPay",
                      icon: <Wallet className="h-6 w-6" />,
                      onClick: () => router.push("/send?kind=dotpay"),
                      tone: "border-white/10 bg-white/5 text-white/85 hover:bg-white/10",
                    },
                    {
                      id: "paybill",
                      label: "PayBill",
                      hint: "Bills",
                      icon: <Landmark className="h-6 w-6" />,
                      onClick: () => router.push("/pay/paybill"),
                      tone: "border-white/10 bg-white/5 text-white/85 hover:bg-white/10",
                    },
                    {
                      id: "till",
                      label: "Till",
                      hint: "Buy goods",
                      icon: <Store className="h-6 w-6" />,
                      onClick: () => router.push("/pay/till"),
                      tone: "border-white/10 bg-white/5 text-white/85 hover:bg-white/10",
                    },
                    {
                      id: "request",
                      label: "Request",
                      hint: "Get paid",
                      icon: <Send className="h-6 w-6" />,
                      onClick: () => router.push("/add-funds?tab=request"),
                      tone: "border-white/10 bg-white/5 text-white/85 hover:bg-white/10",
                    },
                  ] as const
                ).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={a.onClick}
                    className={cn(
                      "rounded-2xl border p-3 text-left transition",
                      a.tone
                    )}
                  >
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-2.5">
                      {a.icon}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">{a.label}</p>
                    <p className="mt-1 text-[11px] text-white/65">{a.hint}</p>
                  </button>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">
                    Activity
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">Recent</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/activity")}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-50 hover:bg-cyan-500/20"
                  >
                    View all
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      activityQuery.refetch();
                      if (backendConfigured) mpesaRecentQuery.refetch();
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                  >
                    <RefreshCw
                      className={cn(
                        "h-4 w-4",
                        activityQuery.isFetching || (backendConfigured && mpesaRecentQuery.isFetching)
                          ? "animate-spin"
                          : ""
                      )}
                    />
                    Refresh
                  </button>
                </div>
              </div>

              {(activityQuery.isLoading || (backendConfigured && mpesaRecentQuery.isLoading)) && activity.length === 0 && (
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              )}

              {(activityQuery.isError || mpesaRecentQuery.isError) && (
                <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-500/10 p-4">
                  <p className="text-sm font-semibold text-amber-100">Some activity is unavailable</p>
                  <p className="mt-1 text-xs text-amber-100/80">
                    {activityQuery.error instanceof Error
                      ? activityQuery.error.message
                      : mpesaRecentQuery.error instanceof Error
                        ? mpesaRecentQuery.error.message
                        : "Please try again."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      activityQuery.refetch();
                      if (backendConfigured) mpesaRecentQuery.refetch();
                    }}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/10"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                </div>
              )}

              {!(
                activityQuery.isLoading ||
                (backendConfigured && mpesaRecentQuery.isLoading)
              ) &&
                !(
                  activityQuery.isError ||
                  (backendConfigured && mpesaRecentQuery.isError)
                ) &&
                activity.length === 0 && (
                <p className="mt-4 text-sm text-white/70">
                  No recent activity yet.
                </p>
              )}

              {activity.length > 0 && (
                <div className="mt-4 space-y-2">
                  {activity.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleOpenReceipt(item)}
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
                        <BlurredValue hidden={hideBalances}>{item.amountText}</BlurredValue>
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </article>
          </div>
        </section>

        <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <SheetContent
            side="bottom"
            className="border border-white/10 bg-[#0d141b] text-white sm:mx-auto sm:max-w-2xl sm:rounded-t-2xl"
          >
            <SheetHeader className="text-left">
              <SheetTitle className="text-white">Notifications</SheetTitle>
              <SheetDescription className="text-white/65">
                Updates about payments and account activity.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 space-y-3">
              {!backendConfigured && (
                <p className="rounded-xl border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  Notifications are unavailable because the backend API is not configured.
                </p>
              )}

              {backendConfigured && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-white/60">
                    {unreadNotifications > 0 ? `${unreadNotifications} unread` : "You're all caught up"}
                  </p>
                  <button
                    type="button"
                    onClick={() => markAllRead.mutate()}
                    disabled={unreadNotifications === 0 || markAllRead.isPending}
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10 disabled:opacity-60"
                  >
                    {markAllRead.isPending ? "Marking…" : "Mark all read"}
                  </button>
                </div>
              )}

              {backendConfigured && notificationsQuery.isLoading && notifications.length === 0 && (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              )}

              {backendConfigured && notificationsQuery.isError && (
                <div className="rounded-2xl border border-amber-300/25 bg-amber-500/10 p-4">
                  <p className="text-sm font-semibold text-amber-100">Unable to load notifications</p>
                  <p className="mt-1 text-xs text-amber-100/80">
                    {notificationsQuery.error instanceof Error
                      ? notificationsQuery.error.message
                      : "Please try again."}
                  </p>
                  <button
                    type="button"
                    onClick={() => notificationsQuery.refetch()}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/10"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                </div>
              )}

              {backendConfigured &&
                !notificationsQuery.isLoading &&
                !notificationsQuery.isError &&
                notifications.length === 0 && (
                  <p className="text-sm text-white/70">No notifications yet.</p>
                )}

              {backendConfigured && notifications.length > 0 && (
                <div className="space-y-2">
                  {notifications.map((n) => {
                    const rawAmount = unitsToNumber(n.value, n.tokenDecimal);
                    const rate = typeof kesPerUsd === "number" ? kesPerUsd : 155;
                    const kesAmount = typeof rawAmount === "number" ? rawAmount * rate : null;
                    const amountText =
                      typeof kesAmount === "number" && Number.isFinite(kesAmount)
                        ? formatKes(kesAmount)
                        : n.tokenSymbol || "USDC";

                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          if (n.readAt) return;
                          markOneRead.mutate(n.id);
                        }}
                        className="flex w-full items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold">Payment received</p>
                            {!n.readAt && <span className="h-1.5 w-1.5 rounded-full bg-cyan-200" />}
                          </div>
                          <p className="mt-1 truncate text-xs text-white/60">
                            From {shortAddress(n.fromAddress)} • {formatTimeAgo(n.eventAt)}
                          </p>
                          {n.note && (
                            <p className="mt-2 line-clamp-2 text-xs text-white/75">
                              Note: {n.note}
                            </p>
                          )}
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-cyan-100">
                          <BlurredValue hidden={hideBalances}>{amountText}</BlurredValue>
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </main>
    </AuthGuard>
  );
}
