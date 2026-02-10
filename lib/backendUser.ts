import type { SessionUser } from "@/types/session-user";

// Set NEXT_PUBLIC_DOTPAY_API_URL in .env (e.g. http://localhost:4000) so users sync to backend.
const API_URL = (process.env.NEXT_PUBLIC_DOTPAY_API_URL || "").trim().replace(/\/+$/, "");

export type BackendUserRecord = {
  id: string;
  address: string;
  email: string | null;
  phone: string | null;
  thirdwebUserId: string | null;
  username: string | null;
  dotpayId: string | null;
  authMethod: SessionUser["authMethod"];
  thirdwebCreatedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export const isBackendApiConfigured = () => Boolean(API_URL);

/**
 * Check if the DotPay backend is reachable (for connectivity verification).
 */
export async function checkBackendConnection(): Promise<boolean> {
  if (!isBackendApiConfigured()) return false;
  try {
    const res = await fetch(`${API_URL}/health`, { method: "GET", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Persist session user to DotPay backend (create or update).
 * Call after sign-in/sign-up when sessionUser is available.
 */
export async function syncUserToBackend(sessionUser: SessionUser): Promise<boolean> {
  if (!isBackendApiConfigured()) return false;
  if (!sessionUser?.address) return false;
  try {
    const res = await fetch(`${API_URL}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        address: sessionUser.address,
        email: sessionUser.email ?? undefined,
        phone: sessionUser.phone ?? undefined,
        userId: sessionUser.userId ?? undefined,
        authMethod: sessionUser.authMethod ?? undefined,
        createdAt: sessionUser.createdAt ?? undefined,
      }),
    });
    if (!res.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Backend sync user failed:", res.status, await res.text());
      }
      return false;
    }
    return true;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Backend sync user error:", err);
    }
    return false;
  }
}

const mapBackendUserRecord = (raw: any, fallbackAddress: string): BackendUserRecord => {
  return {
    id: String(raw?.id ?? ""),
    address: String(raw?.address ?? fallbackAddress),
    email: raw?.email ?? null,
    phone: raw?.phone ?? null,
    thirdwebUserId: raw?.thirdwebUserId ?? null,
    username: raw?.username ?? null,
    dotpayId: raw?.dotpayId ?? null,
    authMethod: raw?.authMethod ?? null,
    thirdwebCreatedAt: raw?.thirdwebCreatedAt ?? null,
    createdAt: raw?.createdAt ?? null,
    updatedAt: raw?.updatedAt ?? null,
  };
};

/**
 * Load a user profile from backend by wallet address.
 */
export async function getUserFromBackend(address: string): Promise<BackendUserRecord | null> {
  if (!isBackendApiConfigured()) return null;
  const normalizedAddress = address?.trim()?.toLowerCase();
  if (!normalizedAddress) return null;

  try {
    const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(normalizedAddress)}`, {
      method: "GET",
      cache: "no-store",
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Backend get user failed:", res.status, await res.text());
      }
      return null;
    }

    const payload = await res.json();
    const data = payload?.data;
    if (!payload?.success || !data) return null;

    return mapBackendUserRecord(data, normalizedAddress);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Backend get user error:", err);
    }
    return null;
  }
}

/**
 * Resolve a recipient identifier (DotPay ID, @username, email, phone) to a user record.
 * Backend returns a minimal payload; fields not returned will be null.
 */
export async function lookupUserFromBackend(query: string): Promise<BackendUserRecord | null> {
  if (!isBackendApiConfigured()) return null;
  const q = query?.trim();
  if (!q) return null;

  try {
    const res = await fetch(`${API_URL}/api/users/lookup?q=${encodeURIComponent(q)}`, {
      method: "GET",
      cache: "no-store",
    });

    if (res.status === 404) return null;

    if (!res.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Backend lookup user failed:", res.status, await res.text());
      }
      return null;
    }

    const payload = await res.json();
    const data = payload?.data;
    if (!payload?.success || !data?.address) return null;

    const fallbackAddress = String(data.address ?? "").trim().toLowerCase();
    return mapBackendUserRecord(data, fallbackAddress);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Backend lookup user error:", err);
    }
    return null;
  }
}

/**
 * Set username for a wallet and provision a DotPay ID (if missing).
 */
export async function setDotpayIdentity(
  address: string,
  username: string
): Promise<BackendUserRecord> {
  if (!isBackendApiConfigured()) {
    throw new Error("Backend API is not configured.");
  }
  const normalizedAddress = address?.trim()?.toLowerCase();
  const normalizedUsername = username?.trim()?.replace(/^@+/, "").toLowerCase();
  if (!normalizedAddress || !normalizedUsername) {
    throw new Error("address and username are required.");
  }

  try {
    const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(normalizedAddress)}/identity`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ username: normalizedUsername }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      const message = payload?.message || "Failed to set DotPay identity.";
      if (process.env.NODE_ENV !== "production") {
        console.warn("Backend set identity failed:", res.status, message);
      }
      throw new Error(message);
    }

    const payload = await res.json();
    const data = payload?.data;
    if (!payload?.success || !data) {
      throw new Error("Invalid identity response from backend.");
    }
    return mapBackendUserRecord(data, normalizedAddress);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Backend set identity error:", err);
    }
    throw err instanceof Error ? err : new Error("Failed to set DotPay identity.");
  }
}
