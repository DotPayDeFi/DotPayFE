"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import AuthHandoff from "@/components/auth/AuthHandoff";
import { useAuthSession } from "@/context/AuthSessionContext";
import {
  getUserFromBackend,
  isBackendApiConfigured,
  setUserPin,
  syncUserToBackend,
  type BackendUserRecord,
} from "@/lib/backendUser";
import { cn } from "@/lib/utils";

const PIN_LENGTH = 6;

const redirectTo = (path: string) => {
  if (typeof window !== "undefined") {
    window.location.assign(path);
  }
};

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, PIN_LENGTH);
}

export default function PinOnboardingPage() {
  const { address, sessionUser, isLoggedIn, hasChecked } = useAuthSession();

  const walletAddress = useMemo(
    () => sessionUser?.address || address || null,
    [address, sessionUser?.address]
  );

  const backendConfigured = isBackendApiConfigured();

  const [checkingProfile, setCheckingProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<BackendUserRecord | null>(null);

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const normalizedPin = useMemo(() => normalizeDigits(pin), [pin]);
  const normalizedConfirm = useMemo(() => normalizeDigits(confirmPin), [confirmPin]);
  const pinsMatch = normalizedPin.length === PIN_LENGTH && normalizedPin === normalizedConfirm;

  useEffect(() => {
    if (hasChecked && !isLoggedIn) {
      redirectTo("/onboarding");
    }
  }, [hasChecked, isLoggedIn]);

  const hydrateState = useCallback(async () => {
    if (!walletAddress) return;

    if (!backendConfigured) {
      // Without the backend, PIN setup can't function; keep UX unblocked.
      setReady(true);
      setError("Security PIN setup is unavailable because the backend API is not configured.");
      return;
    }

    setCheckingProfile(true);
    setError(null);

    try {
      let user = await getUserFromBackend(walletAddress);

      if (!user && sessionUser) {
        await syncUserToBackend(sessionUser);
        user = await getUserFromBackend(walletAddress);
      }

      setProfile(user);

      if (user?.pinSet) {
        // If PIN already set, continue onboarding if needed, otherwise go home.
        if (user?.username) {
          redirectTo("/home");
          return;
        }
        redirectTo("/onboarding/identity");
        return;
      }

      setReady(true);
    } catch {
      // Allow user to proceed to set PIN even if profile lookup fails.
      setReady(true);
    } finally {
      setCheckingProfile(false);
    }
  }, [backendConfigured, sessionUser, walletAddress]);

  useEffect(() => {
    if (!hasChecked) return;
    if (!isLoggedIn) return;
    hydrateState();
  }, [hasChecked, hydrateState, isLoggedIn]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!walletAddress) {
      setError("Wallet not detected. Please reconnect and try again.");
      return;
    }
    if (!backendConfigured) {
      setError("Security PIN setup is unavailable right now.");
      return;
    }

    const nextPin = normalizeDigits(pin);
    const nextConfirm = normalizeDigits(confirmPin);

    if (nextPin.length !== PIN_LENGTH) {
      setError(`PIN must be exactly ${PIN_LENGTH} digits.`);
      return;
    }
    if (nextPin !== nextConfirm) {
      setError("PINs do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await setUserPin(walletAddress, nextPin);
      toast.success("Security PIN set");

      // Continue onboarding if username isn't set yet.
      const usernameSet = Boolean(profile?.username);
      redirectTo(usernameSet ? "/home" : "/onboarding/identity");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set PIN. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (hasChecked && !isLoggedIn) {
    return (
      <AuthHandoff variant="onboarding" title="Session expired" subtitle="Redirecting you to sign in..." />
    );
  }

  if (!ready || checkingProfile || !walletAddress) {
    return (
      <AuthHandoff
        variant="onboarding"
        title="Securing your DotPay wallet"
        subtitle={
          !walletAddress
            ? "Finalizing secure sign-in..."
            : checkingProfile
              ? "Checking your account..."
              : "Preparing your next step..."
        }
      />
    );
  }

  if (!backendConfigured) {
    return (
      <main className="app-background min-h-screen px-4 py-8 text-white">
        <section className="mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-black/40 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Security</p>
          <h1 className="mt-2 text-2xl font-bold">Temporarily unavailable</h1>
          <p className="mt-2 text-sm text-white/75">
            Your session is active, but security setup needs the backend API configured.
          </p>
          {error && (
            <p className="mt-4 rounded-lg border border-amber-300/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => redirectTo("/home")}
            className="mt-6 w-full rounded-xl border border-cyan-300/40 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25"
          >
            Continue to DotPay
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-background min-h-screen px-4 py-8 text-white">
      <section className="mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-black/40 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Step 1 of 2</p>
            <h1 className="mt-2 text-2xl font-bold">Set your security PIN</h1>
            <p className="mt-2 text-sm text-white/75">
              You will use this 6-digit PIN to approve cashouts and merchant payments.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-cyan-100">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium">New PIN</label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                value={normalizedPin}
                onChange={(e) => setPin(normalizeDigits(e.target.value))}
                placeholder="••••••"
                inputMode="numeric"
                autoComplete="new-password"
                className={cn(
                  "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-3 pr-12 text-center text-lg tracking-[0.45em] outline-none placeholder:text-white/35",
                  normalizedPin.length > 0 && normalizedPin.length < PIN_LENGTH ? "border-amber-300/35" : ""
                )}
              />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-white"
                aria-label={showPin ? "Hide PIN" : "Show PIN"}
              >
                {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Confirm PIN</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={normalizedConfirm}
                onChange={(e) => setConfirmPin(normalizeDigits(e.target.value))}
                placeholder="••••••"
                inputMode="numeric"
                autoComplete="new-password"
                className={cn(
                  "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-3 pr-12 text-center text-lg tracking-[0.45em] outline-none placeholder:text-white/35",
                  normalizedConfirm.length > 0 && normalizedConfirm.length < PIN_LENGTH ? "border-amber-300/35" : ""
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 hover:text-white"
                aria-label={showConfirm ? "Hide confirm PIN" : "Show confirm PIN"}
              >
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-300/35 bg-red-500/10 px-3 py-2 text-xs text-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !pinsMatch}
            className="w-full rounded-xl border border-cyan-300/40 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-60"
          >
            {submitting ? "Saving PIN..." : "Continue"}
          </button>
        </form>
      </section>
    </main>
  );
}

