"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuthSession } from "@/context/AuthSessionContext";
import {
  getUserFromBackend,
  isBackendApiConfigured,
  setDotpayIdentity,
  syncUserToBackend,
} from "@/lib/backendUser";
import AuthHandoff from "@/components/auth/AuthHandoff";

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

const normalizeUsername = (value: string) => value.trim().replace(/^@+/, "").toLowerCase();
const redirectToHome = () => {
  if (typeof window !== "undefined") {
    window.location.assign("/home");
  }
};

export default function DotpayIdentityOnboardingPage() {
  const { address, sessionUser, isLoggedIn, hasChecked } = useAuthSession();
  const [username, setUsername] = useState("");
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const walletAddress = useMemo(
    () => sessionUser?.address || address || null,
    [address, sessionUser?.address]
  );

  const resolvedUsername = normalizeUsername(username);
  const isUsernameValid = USERNAME_REGEX.test(resolvedUsername);
  const backendConfigured = isBackendApiConfigured();

  useEffect(() => {
    if (hasChecked && !isLoggedIn) {
      if (typeof window !== "undefined") {
        window.location.replace("/onboarding");
      }
    }
  }, [hasChecked, isLoggedIn]);

  const hydrateIdentityState = useCallback(async () => {
    if (!walletAddress) return;

    if (!backendConfigured) {
      setError("Identity setup is unavailable because the backend API is not configured.");
      setReady(true);
      return;
    }

    setCheckingProfile(true);
    setError(null);

    try {
      let profile = await getUserFromBackend(walletAddress);

      if (!profile && sessionUser) {
        await syncUserToBackend(sessionUser);
        profile = await getUserFromBackend(walletAddress);
      }

      if (profile && !profile.pinSet) {
        if (typeof window !== "undefined") {
          window.location.assign("/onboarding/pin");
        }
        return;
      }

      if (profile?.username) {
        redirectToHome();
        return;
      }
      setReady(true);
    } catch {
      // Non-blocking: user can still set username even if profile read fails.
      setReady(true);
    } finally {
      setCheckingProfile(false);
    }
  }, [backendConfigured, sessionUser, walletAddress]);

  useEffect(() => {
    if (!hasChecked) return;
    if (!isLoggedIn) return;
    hydrateIdentityState();
  }, [hasChecked, hydrateIdentityState, isLoggedIn]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!walletAddress) {
      setError("Wallet not detected. Please reconnect and try again.");
      return;
    }

    if (!backendConfigured) {
      setError("Identity setup is currently unavailable. Please continue to DotPay.");
      return;
    }

    if (!isUsernameValid) {
      setError("Username must be 3-20 chars using lowercase letters, numbers, or underscore.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const updated = await setDotpayIdentity(walletAddress, resolvedUsername);
      toast.success(`Welcome @${updated.username}!`);
      // Use a hard redirect so this step reliably exits even when app-router state is stale.
      redirectToHome();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save username. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (hasChecked && !isLoggedIn) {
    return (
      <AuthHandoff
        variant="onboarding"
        title="Session expired"
        subtitle="Redirecting you to sign in..."
      />
    );
  }

  if (!ready || checkingProfile || !walletAddress) {
    return (
      <AuthHandoff
        variant="onboarding"
        title="Setting up your DotPay identity"
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
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Identity Setup</p>
          <h1 className="mt-2 text-2xl font-bold">Temporarily unavailable</h1>
          <p className="mt-2 text-sm text-white/75">
            Your session is active, but DotPay identity setup needs the backend API configured.
          </p>
          {error && (
            <p className="mt-4 rounded-lg border border-amber-300/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={redirectToHome}
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
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Step 2 of 2</p>
        <h1 className="mt-2 text-2xl font-bold">Choose your username</h1>
        <p className="mt-2 text-sm text-white/75">
          Usernames are for confirmation and in-app display. Payments use your DotPay ID (DP...), which we generate after you set this.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="dotpay-username" className="mb-2 block text-sm font-medium">
              Username
            </label>
            <div className="flex items-center rounded-xl border border-white/15 bg-white/5 px-3">
              <span className="text-sm text-white/60">@</span>
              <input
                id="dotpay-username"
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="yourname"
                className="w-full bg-transparent px-2 py-3 text-sm outline-none placeholder:text-white/35"
              />
            </div>
            <p className="mt-2 text-xs text-white/60">
              Use 3-20 characters: lowercase letters, numbers, and underscore. This username is not used as a payment input.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs uppercase tracking-wide text-white/55">Preview</p>
            <p className="mt-1 text-sm font-semibold">@{resolvedUsername || "yourname"}</p>
          </div>

          {checkingProfile && (
            <p className="text-xs text-white/60">Verifying profile in the background...</p>
          )}

          {!walletAddress && (
            <p className="text-xs text-white/60">Finalizing secure sign-in...</p>
          )}

          {error && (
            <p className="rounded-lg border border-red-300/35 bg-red-500/10 px-3 py-2 text-xs text-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !isUsernameValid || !walletAddress}
            className="w-full rounded-xl border border-cyan-300/40 bg-cyan-500/15 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-60"
          >
            {submitting ? "Creating your identity..." : "Continue to DotPay"}
          </button>
        </form>
      </section>
    </main>
  );
}
