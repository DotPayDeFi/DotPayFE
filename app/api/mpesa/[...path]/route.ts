import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/(auth)/actions/login";
import { signBackendToken } from "@/lib/backendAuthToken";

function getBackendUrl() {
  return (process.env.NEXT_PUBLIC_DOTPAY_API_URL || "").trim().replace(/\/+$/, "");
}

function summarizeBody(raw: string | undefined) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const src = parsed as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const copy = (key: string) => {
      const value = src[key];
      if (value !== undefined && value !== null && value !== "") out[key] = value;
    };

    copy("flowType");
    copy("quoteId");
    copy("amount");
    copy("currency");
    copy("phoneNumber");
    copy("paybillNumber");
    copy("tillNumber");
    copy("accountReference");
    copy("businessId");
    copy("chainId");
    copy("onchainTxHash");

    if ("pin" in src) out.pin = String(src.pin || "").trim() ? "provided" : "missing";
    if ("signature" in src) {
      const len = String(src.signature || "").trim().length;
      out.signature = len > 0 ? `provided(len:${len})` : "missing";
    }
    if ("nonce" in src) out.nonce = String(src.nonce || "").trim() ? "provided" : "missing";
    if ("signedAt" in src) out.signedAt = String(src.signedAt || "").trim() ? "provided" : "missing";

    return out;
  } catch {
    return {};
  }
}

async function proxy(request: NextRequest, params: { path: string[] }) {
  const requestId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();
  const backendUrl = getBackendUrl();
  if (!backendUrl) {
    console.error(`[FE M-Pesa Proxy] req=${requestId} missing NEXT_PUBLIC_DOTPAY_API_URL`);
    return NextResponse.json(
      { success: false, message: "NEXT_PUBLIC_DOTPAY_API_URL is not configured." },
      { status: 500 }
    );
  }

  const sessionUser = await getSessionUser();
  const address = sessionUser?.address?.trim()?.toLowerCase() || null;
  if (!address) {
    console.warn(`[FE M-Pesa Proxy] req=${requestId} unauthorized: missing session address`);
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  let token: string;
  try {
    token = signBackendToken(address, 5 * 60);
  } catch (err) {
    console.error(
      `[FE M-Pesa Proxy] req=${requestId} token signing failed: ${
        err instanceof Error ? err.message : "unknown error"
      }`
    );
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Token signing failed." },
      { status: 500 }
    );
  }

  const joinedPath = (params.path || []).map((x) => encodeURIComponent(x)).join("/");
  const backendTarget = new URL(`${backendUrl}/api/mpesa/${joinedPath}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    backendTarget.searchParams.set(key, value);
  });

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  const idempotency = request.headers.get("idempotency-key");
  if (idempotency) headers["Idempotency-Key"] = idempotency;

  const method = request.method.toUpperCase();
  let body: string | undefined;

  if (!["GET", "HEAD"].includes(method)) {
    const textBody = await request.text();
    if (textBody) {
      headers["Content-Type"] = "application/json";
      body = textBody;
    }
  }

  console.info(
    `[FE M-Pesa Proxy] req=${requestId} start method=${method} path=/api/mpesa/${joinedPath}${
      request.nextUrl.search ? request.nextUrl.search : ""
    } user=${address} target=${backendTarget.toString()} idem=${
      idempotency || "-"
    } body=${JSON.stringify(summarizeBody(body))}`
  );

  try {
    const response = await fetch(backendTarget.toString(), {
      method,
      headers,
      body,
      cache: "no-store",
    });

    const text = await response.text();
    let backendMessage = "";
    try {
      const parsed = text ? JSON.parse(text) : {};
      backendMessage = String((parsed as { message?: string })?.message || "").trim();
    } catch {
      backendMessage = "";
    }
    console.info(
      `[FE M-Pesa Proxy] req=${requestId} finish status=${response.status} durationMs=${
        Date.now() - startedAt
      } message=${backendMessage || "-"}`
    );
    return new NextResponse(text || "{}", {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "application/json",
      },
    });
  } catch (err) {
    console.error(
      `[FE M-Pesa Proxy] req=${requestId} backend fetch failed after ${
        Date.now() - startedAt
      }ms: ${err instanceof Error ? err.message : "unknown error"}`
    );
    return NextResponse.json(
      { success: false, message: "Failed to reach backend M-Pesa service." },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(request, params);
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(request, params);
}
