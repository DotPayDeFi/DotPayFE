"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import {
  getSessionUser,
  isLoggedIn as serverIsLoggedIn,
  logout as serverLogout,
} from "@/app/(auth)/actions/login";
import { checkBackendConnection, syncUserToBackend } from "@/lib/backendUser";
import type { SessionUser } from "@/types/session-user";

type AuthSessionContextValue = {
  address: string | null;
  sessionUser: SessionUser | null;
  isLoggedIn: boolean;
  loading: boolean;
  /** True after first session check (so we know whether to show content or redirect). */
  hasChecked: boolean;
  refresh: (options?: { background?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

function createClientToken(address: string | null | undefined) {
  const normalized = String(address || "").trim().toLowerCase();
  const random = Math.random().toString(36).slice(2);
  return `dotpay_${normalized}_${Date.now()}_${random}`;
}

function persistLegacyClientAuth(user: SessionUser | null, fallbackAddress?: string | null) {
  if (typeof window === "undefined") return;

  const address = user?.address || fallbackAddress || null;
  if (!address) return;

  try {
    const existingToken = localStorage.getItem("dotpay_token");
    if (!existingToken || existingToken.length < 20) {
      localStorage.setItem("dotpay_token", createClientToken(address));
    }

    const legacyUser = {
      address,
      walletAddress: address,
      phone: user?.phone ?? null,
      phoneNumber: user?.phone ?? null,
      email: user?.email ?? null,
      userId: user?.userId ?? null,
      authMethod: user?.authMethod ?? null,
      createdAt: user?.createdAt ?? null,
    };
    localStorage.setItem("dotpay_user", JSON.stringify(legacyUser));
  } catch {
    // Ignore localStorage failures in restrictive browsers.
  }
}

function clearLegacyClientAuth() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("dotpay_token");
    localStorage.removeItem("dotpay_user");
  } catch {
    // Ignore localStorage failures in restrictive browsers.
  }
}

export const AuthSessionProvider = ({ children }: { children: React.ReactNode }) => {
  const account = useActiveAccount();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const syncedUserKeysRef = useRef<Set<string>>(new Set());
  const enableBackendHealthCheck = process.env.NEXT_PUBLIC_ENABLE_BACKEND_HEALTHCHECK === "true";

  // background=true: update state without showing loading (for post-login).
  const refresh = useCallback(async (options?: { background?: boolean }) => {
    const background = Boolean(options?.background);
    if (!background) setLoading(true);

    try {
      const loggedIn = await serverIsLoggedIn();
      setIsLoggedIn(loggedIn);
      setHasChecked(true);

      if (!loggedIn) {
        setSessionUser(null);
        return;
      }

      getSessionUser()
        .then((user) => {
          const nextUser = user ?? null;
          setSessionUser(nextUser);
          persistLegacyClientAuth(nextUser, null);
          if (!nextUser) return;

          const syncKey = `${nextUser.address}:${nextUser.userId ?? "no-user-id"}`;
          if (syncedUserKeysRef.current.has(syncKey)) return;
          syncedUserKeysRef.current.add(syncKey);
          syncUserToBackend(nextUser);
        })
        .catch(() => setSessionUser(null));
    } catch (error) {
      console.error("Failed to refresh auth session:", error);
      setIsLoggedIn(false);
      setSessionUser(null);
      setHasChecked(true);
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  // Run in background so onboarding shows immediately; redirect when already logged in.
  useEffect(() => {
    refresh({ background: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address]);

  // One-time backend connectivity check (log so you can verify frontend ↔ backend).
  useEffect(() => {
    if (!enableBackendHealthCheck) return;
    if (process.env.NODE_ENV === "production") return;

    checkBackendConnection().then((ok) => {
      if (ok) {
        console.log("[DotPay] Backend connected – user sync will run on sign-in.");
      } else {
        console.warn(
          "[DotPay] Backend unreachable – ensure the DotPay backend is running and NEXT_PUBLIC_DOTPAY_API_URL is set."
        );
      }
    });
  }, [enableBackendHealthCheck]);

  // Post-login: optimistic UI (show home immediately), sync address to backend, then refresh in background.
  useEffect(() => {
    const onLogin = (e: Event) => {
      const detail = (e as CustomEvent<{ address?: string }>).detail;
      const address = detail?.address;
      if (address) {
        persistLegacyClientAuth(
          {
            address,
            email: null,
            phone: null,
            userId: null,
            authMethod: null,
            createdAt: null,
          },
          address
        );
        const syncKey = `${address}:no-user-id`;
        if (!syncedUserKeysRef.current.has(syncKey)) {
          syncedUserKeysRef.current.add(syncKey);
          syncUserToBackend({
            address,
            email: null,
            phone: null,
            userId: null,
            authMethod: null,
            createdAt: null,
          });
        }
      }
      setIsLoggedIn(true);
      setLoading(false);
      setHasChecked(true);
      refresh({ background: true });
    };
    window.addEventListener("dotpay-auth-login", onLogin);
    return () => window.removeEventListener("dotpay-auth-login", onLogin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(async () => {
    // Optimistically clear local auth state for instant UI consistency.
    setIsLoggedIn(false);
    setSessionUser(null);
    setHasChecked(true);
    setLoading(false);
    syncedUserKeysRef.current.clear();
    clearLegacyClientAuth();

    const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
      Promise.race<T>([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`Logout request timed out after ${ms}ms`)), ms)
        ),
      ]);

    const tasks: Promise<unknown>[] = [
      withTimeout(serverLogout(), 5000),
      withTimeout(
        fetch("/api/auth/logout", {
          method: "POST",
          cache: "no-store",
        }),
        5000
      ),
    ];

    const results = await Promise.allSettled(tasks);
    const rejected = results.filter((result) => result.status === "rejected");
    if (rejected.length > 0) {
      console.error("One or more logout requests failed.", rejected);
    }
  }, []);

  return (
    <AuthSessionContext.Provider
      value={{
        address: account?.address ?? null,
        sessionUser,
        isLoggedIn,
        loading,
        hasChecked,
        refresh,
        logout,
      }}
    >
      {children}
    </AuthSessionContext.Provider>
  );
};

export const useAuthSession = () => {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error("useAuthSession must be used within an AuthSessionProvider");
  }
  return context;
};
