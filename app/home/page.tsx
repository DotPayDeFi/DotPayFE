"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  Bell,
  ChevronRight,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  LogOut,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  UserCircle2,
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
import { useKesRate } from "@/hooks/useKesRate";
import { type OnchainTransfer, useOnchainActivity } from "@/hooks/useOnchainActivity";
import { getDotPayNetwork, getDotPaySupportedChains, getDotPayUsdcChain } from "@/lib/dotpayNetwork";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/useNotifications";

// Circle's official USDC (proxy) on Arbitrum Sepolia.
// Source: Circle "USDC Contract Addresses" docs.
const USDC_ARBITRUM_SEPOLIA_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as const;

// Circle native USDC on Arbitrum One (mainnet).
const USDC_ARBITRUM_ONE_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as const;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

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

const formatKes = (value: number) => `KES ${formatKesNumber(value, 0)}`;

const formatUsdc = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  amountText: string;
  direction: "+" | "-";
  status: "completed" | "pending" | "processing" | "failed" | "unknown";
  createdAt: string | null;
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
    title,
    subtitle,
    amountText,
    direction,
    status: "completed",
    createdAt,
  };
};

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
  const { address, sessionUser, logout } = useAuthSession();

  const dotpayNetwork = getDotPayNetwork();
  const network = dotpayNetwork;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hideBalances, setHideBalances] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showReconnectCta, setShowReconnectCta] = useState(false);

  const backendConfigured = isBackendApiConfigured();
  const profileAddress = useMemo(() => sessionUser?.address || address || null, [address, sessionUser?.address]);
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
    address: profileAddress,
    network,
    limit: 12,
  });

  const activity = useMemo(() => {
    if (!profileAddress) return [];
    const transfers = activityQuery.data ?? [];
    return transfers
      .slice(0, 8)
      .map((t) => activityFromTransfer(t, profileAddress, kesPerUsd))
      .sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
  }, [activityQuery.data, kesPerUsd, profileAddress]);

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
    address: profileAddress ?? ZERO_ADDRESS,
    queryOptions: {
      enabled: Boolean(profileAddress),
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
  const greeting = `${getTimeGreeting()}, ${greetingName}`;

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
          description: "Stablecoin wallet for fast crypto payments.",
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
  }, [activityQuery, loadBackendProfile, refetchKesRate, refetchUsdcBalance]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await logout();
      window.location.replace("/onboarding");
    } finally {
      setLoggingOut(false);
    }
  }, [logout]);

  const copyAddress = useCallback(async () => {
    if (!profileAddress) return;
    try {
      await navigator.clipboard.writeText(profileAddress);
      toast.success("Address copied");
    } catch {
      toast.error("Unable to copy");
    }
  }, [profileAddress]);

  const handleQuickAction = (action: "send" | "pay" | "add-funds") => {
    if (action === "send") {
      router.push("/send");
      return;
    }
    if (action === "pay") {
      router.push("/send?mode=pay");
      return;
    }
    router.push("/receive?mode=add-funds");
  };

  const notificationsQuery = useNotifications({ limit: 25, enabled: backendConfigured });
  const markAllRead = useMarkAllNotificationsRead();
  const markOneRead = useMarkNotificationRead();
  const unreadNotifications = notificationsQuery.data?.unreadCount ?? 0;
  const notifications = notificationsQuery.data?.notifications ?? [];

  return (
    <AuthGuard redirectTo="/onboarding">
      <main className="app-background !h-auto min-h-screen px-4 pb-24 pt-6 text-white !items-stretch !justify-start">
        <section className="mx-auto w-full max-w-5xl space-y-4">
          <header className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <DotPayLogo size={28} className="shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/80">
                  DotPay
                </p>
                <p className="mt-0.5 truncate text-sm text-white/75">{greeting}</p>
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
                onClick={() => setSheetOpen(true)}
                className="rounded-2xl border border-cyan-300/35 bg-cyan-500/10 p-2.5 hover:bg-cyan-500/20"
                aria-label="Account"
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
                  ) : !profileAddress ? (
                    <p className="text-sm text-white/75">Reconnect to view balance</p>
                  ) : (
                    <Skeleton className="h-10 w-64" />
                  )}

                  <div className="mt-3 flex flex-col gap-1.5 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      {typeof totalUsd === "number" ? (
                        <span>
                          <BlurredValue hidden={hideBalances}>
                            {formatUsdc(totalUsd)} USDC
                          </BlurredValue>
                        </span>
                      ) : usdcBalanceError ? (
                        <span className="text-white/60">Balance unavailable</span>
                      ) : profileAddress ? (
                        <Skeleton className="h-4 w-24" />
                      ) : (
                        <span className="text-white/60">—</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {typeof kesPerUsd === "number" ? (
                        <>
                          <span className="text-white/55">Rate</span>
                          <span>1 USDC ≈ KES {formatKesNumber(kesPerUsd, 2)}</span>
                        </>
                      ) : kesRateLoading ? (
                        <span className="text-white/60">Updating rate…</span>
                      ) : (
                        <span className="text-white/60">Rate unavailable</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHideBalances((v) => !v)}
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
                      usdcBalanceFetching || kesRateFetching || backendStatus === "loading" || activityQuery.isFetching
                        ? "animate-spin"
                        : ""
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(
                [
                  {
                    id: "send" as const,
                    label: "Send",
                    hint: "On-chain or M-Pesa",
                    icon: <Send className="h-5 w-5" />,
                    onClick: () => handleQuickAction("send"),
                  },
                  {
                    id: "pay" as const,
                    label: "Pay",
                    hint: "Utilities, merchants",
                    icon: <CreditCard className="h-5 w-5" />,
                    onClick: () => handleQuickAction("pay"),
                  },
                  {
                    id: "add-funds" as const,
                    label: "Add Funds",
                    hint: "Top up or receive",
                    icon: <ArrowDownLeft className="h-5 w-5" />,
                    onClick: () => handleQuickAction("add-funds"),
                  },
                ] as const
              ).map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={action.onClick}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-4 text-left hover:bg-black/35"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-cyan-100">
                      {action.icon}
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/35 transition group-hover:translate-x-0.5 group-hover:text-white/50" />
                  </div>
                  <p className="mt-3 text-sm font-semibold">{action.label}</p>
                  <p className="mt-1 text-xs text-white/65">{action.hint}</p>
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                    <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl" />
                  </div>
                </button>
              ))}
            </div>
          </article>

          <div className="grid grid-cols-1 gap-4">
            <article className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">
                    Activity
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">Recent</h2>
                </div>
                <button
                  type="button"
                  onClick={() => activityQuery.refetch()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                >
                  <RefreshCw className={cn("h-4 w-4", activityQuery.isFetching ? "animate-spin" : "")} />
                  Refresh
                </button>
              </div>

              {activityQuery.isLoading && activity.length === 0 && (
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              )}

              {activityQuery.isError && (
                <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-500/10 p-4">
                  <p className="text-sm font-semibold text-amber-100">Activity unavailable</p>
                  <p className="mt-1 text-xs text-amber-100/80">
                    {activityQuery.error instanceof Error
                      ? activityQuery.error.message
                      : "Please try again."}
                  </p>
                  <button
                    type="button"
                    onClick={() => activityQuery.refetch()}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/10"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                </div>
              )}

              {!activityQuery.isLoading && !activityQuery.isError && activity.length === 0 && (
                <p className="mt-4 text-sm text-white/70">
                  No recent activity yet.
                </p>
              )}

              {activity.length > 0 && (
                <div className="mt-4 space-y-2">
                  {activity.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
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
                    </div>
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

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="bottom"
            className="border border-white/10 bg-[#0d141b] text-white sm:mx-auto sm:max-w-2xl sm:rounded-t-2xl"
          >
            <SheetHeader className="text-left">
              <SheetTitle className="text-white">Account</SheetTitle>
              <SheetDescription className="text-white/65">
                Security, identity, and session details.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 space-y-4">
              {!backendConfigured && (
                <p className="rounded-xl border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  Profile sync is disabled because the backend API is not configured.
                </p>
              )}

              {backendStatus === "error" && backendError && (
                <p className="rounded-xl border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  {backendError}
                </p>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">
                    Username (confirmation)
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {backendStatus === "loading" ? "Loading…" : backendUser?.username ? `@${backendUser.username}` : "Not set"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">
                    DotPay ID
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {backendStatus === "loading" ? "Loading…" : backendUser?.dotpayId || "Not provisioned"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:col-span-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">
                        Address
                      </p>
                      <p className="mt-1 truncate font-mono text-xs text-white/80">
                        {profileAddress || "Not available"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={copyAddress}
                      disabled={!profileAddress}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-60"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              {(backendConfigured && Boolean(profileAddress) && (!dotpayId || !backendUser?.username)) && (
                <button
                  type="button"
                  onClick={() => router.push("/onboarding/identity")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/25"
                >
                  <Sparkles className="h-4 w-4" />
                  {dotpayId ? "Add username" : "Activate DotPay ID"}
                </button>
              )}

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                {loggingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </main>
    </AuthGuard>
  );
}
