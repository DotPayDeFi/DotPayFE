"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Copy, LogOut, ShieldCheck, UserCircle2 } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { DetailsDisclosure } from "@/components/ui/DetailsDisclosure";
import { useAuthSession } from "@/context/AuthSessionContext";
import {
  getUserFromBackend,
  isBackendApiConfigured,
  setDotpayIdentity,
  setUserPin,
  syncUserToBackend,
  type BackendUserRecord,
} from "@/lib/backendUser";

const PIN_LENGTH = 6;
const HIDE_BALANCES_KEY = "dotpay_hide_balances";

function normalizeUsername(value: string) {
  return String(value || "").trim().replace(/^@+/, "").toLowerCase();
}

function normalizePinDigits(value: string) {
  return String(value || "").replace(/\D/g, "").slice(0, PIN_LENGTH);
}

export default function SettingsPage() {
  const { address, sessionUser, logout } = useAuthSession();
  const backendConfigured = isBackendApiConfigured();

  const walletAddress = useMemo(
    () => sessionUser?.address || address || null,
    [address, sessionUser?.address]
  );

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profile, setProfile] = useState<BackendUserRecord | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [confirmationName, setConfirmationName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [hideBalancesByDefault, setHideBalancesByDefault] = useState(false);

  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [changingPin, setChangingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHideBalancesByDefault(window.localStorage.getItem(HIDE_BALANCES_KEY) === "1");
  }, []);

  useEffect(() => {
    if (!backendConfigured) return;
    if (!walletAddress) return;

    let cancelled = false;
    setLoadingProfile(true);
    setProfileError(null);

    const load = async () => {
      try {
        let user = await getUserFromBackend(walletAddress);
        if (!user && sessionUser) {
          await syncUserToBackend(sessionUser);
          user = await getUserFromBackend(walletAddress);
        }
        if (cancelled) return;
        setProfile(user);
        setConfirmationName(user?.username ? String(user.username) : "");
      } catch {
        if (cancelled) return;
        setProfile(null);
        setProfileError("Unable to load your profile right now.");
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [backendConfigured, sessionUser, walletAddress]);

  const dotpayId = useMemo(() => {
    const value = profile?.dotpayId;
    return value ? String(value).trim().toUpperCase() : null;
  }, [profile?.dotpayId]);

  const copyText = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Unable to copy");
    }
  }, []);

  const saveName = useCallback(async () => {
    if (!backendConfigured) {
      toast.error("Profile updates are unavailable right now.");
      return;
    }
    if (!walletAddress) {
      toast.error("Reconnect your account and try again.");
      return;
    }

    const next = normalizeUsername(confirmationName);
    if (!/^[a-z0-9_]{3,20}$/.test(next)) {
      toast.error("Use 3-20 characters: lowercase letters, numbers, and underscore.");
      return;
    }

    setSavingName(true);
    try {
      const updated = await setDotpayIdentity(walletAddress, next);
      setProfile(updated);
      setConfirmationName(updated.username ? String(updated.username) : next);
      toast.success("Confirmation name updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update name.");
    } finally {
      setSavingName(false);
    }
  }, [backendConfigured, confirmationName, walletAddress]);

  const toggleHideBalances = useCallback((next: boolean) => {
    setHideBalancesByDefault(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(HIDE_BALANCES_KEY, next ? "1" : "0");
    }
    toast.success(next ? "Balances will be hidden by default" : "Balances will be shown by default");
  }, []);

  const changePin = useCallback(async () => {
    if (!backendConfigured) {
      setPinError("PIN updates are unavailable right now.");
      return;
    }
    if (!walletAddress) {
      setPinError("Reconnect your account and try again.");
      return;
    }

    setPinError(null);
    if (oldPin.length !== PIN_LENGTH) {
      setPinError(`Old PIN must be ${PIN_LENGTH} digits.`);
      return;
    }
    if (newPin.length !== PIN_LENGTH) {
      setPinError(`New PIN must be ${PIN_LENGTH} digits.`);
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("New PINs do not match.");
      return;
    }

    setChangingPin(true);
    try {
      await setUserPin(walletAddress, newPin, oldPin);
      setOldPin("");
      setNewPin("");
      setConfirmPin("");
      toast.success("PIN updated");
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "Failed to update PIN.");
    } finally {
      setChangingPin(false);
    }
  }, [backendConfigured, confirmPin, newPin, oldPin, walletAddress]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      if (typeof window !== "undefined") window.location.replace("/onboarding");
    }
  }, [logout]);

  return (
    <AuthGuard redirectTo="/onboarding">
      <main className="app-background min-h-screen px-4 pb-10 pt-6 text-white !items-stretch !justify-start">
        <section className="mx-auto w-full max-w-xl space-y-5">
          <header>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Settings</p>
            <h1 className="mt-1 text-2xl font-bold">Account & security</h1>
            <p className="mt-2 text-sm text-white/70">Manage your profile, PIN, and app preferences.</p>
          </header>

          <section className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/60">Profile</p>
                <h2 className="mt-1 text-lg font-semibold">Your DotPay account</h2>
                <p className="mt-1 text-xs text-white/65">
                  Your confirmation name is shown before sending to help you verify the right person.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-cyan-100">
                <UserCircle2 className="h-5 w-5" />
              </div>
            </div>

            {!backendConfigured && (
              <p className="mt-4 rounded-xl border border-amber-300/25 bg-amber-500/10 p-3 text-xs text-amber-100">
                Backend profile is not configured. Some settings may be unavailable.
              </p>
            )}

            {profileError && (
              <p className="mt-4 rounded-xl border border-amber-300/25 bg-amber-500/10 p-3 text-xs text-amber-100">
                {profileError}
              </p>
            )}

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-white/60">DotPay ID</p>
                    <p className="mt-1 truncate text-sm font-semibold">{dotpayId || "Not set"}</p>
                  </div>
                  {dotpayId && (
                    <button
                      type="button"
                      onClick={() => copyText(dotpayId, "DotPay ID")}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-black/30"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <label className="text-xs text-white/70">Confirmation name</label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3 py-2">
                  <span className="text-sm text-white/60">@</span>
                  <input
                    value={confirmationName}
                    onChange={(e) => setConfirmationName(e.target.value)}
                    placeholder="yourname"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/35 outline-none"
                  />
                </div>
                <p className="mt-2 text-xs text-white/55">Use 3-20 characters: lowercase letters, numbers, underscore.</p>
                <button
                  type="button"
                  onClick={saveName}
                  disabled={!backendConfigured || savingName || loadingProfile}
                  className="mt-3 w-full rounded-xl border border-cyan-300/35 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/25 disabled:opacity-60"
                >
                  {savingName ? "Saving..." : "Save name"}
                </button>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Hide balances by default</p>
                    <p className="mt-1 text-xs text-white/65">Balances will start blurred on Home and Activity.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleHideBalances(!hideBalancesByDefault)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                      hideBalancesByDefault
                        ? "border-cyan-300/35 bg-cyan-500/15 text-cyan-50"
                        : "border-white/15 bg-black/20 text-white/75 hover:bg-black/30"
                    }`}
                  >
                    {hideBalancesByDefault ? "On" : "Off"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/60">Security</p>
                <h2 className="mt-1 text-lg font-semibold">Change PIN</h2>
                <p className="mt-1 text-xs text-white/65">
                  For your safety, we’ll ask for your current PIN before changing it.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-cyan-100">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <DetailsDisclosure label="Change PIN">
                <div className="space-y-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <label className="text-xs text-white/70">Current PIN</label>
                    <input
                      value={oldPin}
                      onChange={(e) => {
                        setPinError(null);
                        setOldPin(normalizePinDigits(e.target.value));
                      }}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={PIN_LENGTH}
                      type="password"
                      autoComplete="off"
                      placeholder="••••••"
                      disabled={changingPin}
                      className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-base tracking-[0.3em] text-white placeholder:text-white/35 outline-none"
                    />
                    <p className="mt-2 text-xs text-white/55">Enter your current PIN.</p>
                    {pinError && <p className="mt-2 text-xs text-amber-100/90">{pinError}</p>}
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <label className="text-xs text-white/70">New PIN</label>
                    <input
                      value={newPin}
                      onChange={(e) => {
                        setPinError(null);
                        setNewPin(normalizePinDigits(e.target.value));
                      }}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={PIN_LENGTH}
                      type="password"
                      autoComplete="off"
                      placeholder="••••••"
                      disabled={changingPin}
                      className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-base tracking-[0.3em] text-white placeholder:text-white/35 outline-none"
                    />
                    <p className="mt-2 text-xs text-white/55">Choose a new 6-digit PIN.</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <label className="text-xs text-white/70">Confirm new PIN</label>
                    <input
                      value={confirmPin}
                      onChange={(e) => {
                        setPinError(null);
                        setConfirmPin(normalizePinDigits(e.target.value));
                      }}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={PIN_LENGTH}
                      type="password"
                      autoComplete="off"
                      placeholder="••••••"
                      disabled={changingPin}
                      className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-base tracking-[0.3em] text-white placeholder:text-white/35 outline-none"
                    />
                    <p className="mt-2 text-xs text-white/55">Re-enter your new PIN.</p>
                  </div>

                  <button
                    type="button"
                    onClick={changePin}
                    disabled={!backendConfigured || changingPin}
                    className="w-full rounded-xl border border-cyan-300/35 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-50 hover:bg-cyan-500/25 disabled:opacity-60"
                  >
                    {changingPin ? "Updating..." : "Update PIN"}
                  </button>
                </div>
              </DetailsDisclosure>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">Help</p>
            <h2 className="mt-1 text-lg font-semibold">Support</h2>
            <p className="mt-2 text-sm text-white/70">
              Need help? Contact support and include your transaction ID.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <a
                href="mailto:support@dotpay.xyz"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10"
              >
                Email support
              </a>
              <button
                type="button"
                onClick={() => toast("WhatsApp support will be enabled soon.")}
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10"
              >
                WhatsApp
              </button>
            </div>
          </section>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-300/25 bg-red-500/10 px-4 py-4 text-sm font-semibold text-red-100 hover:bg-red-500/15"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </section>
      </main>
    </AuthGuard>
  );
}
