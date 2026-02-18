import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/(auth)/actions/login";
import { signBackendToken } from "@/lib/backendAuthToken";

function getBackendUrl() {
  return (process.env.NEXT_PUBLIC_DOTPAY_API_URL || "").trim().replace(/\/+$/, "");
}

async function proxy(request: NextRequest, params: { path: string[] }) {
  const backendUrl = getBackendUrl();
  if (!backendUrl) {
    return NextResponse.json(
      { success: false, message: "NEXT_PUBLIC_DOTPAY_API_URL is not configured." },
      { status: 500 }
    );
  }

  const sessionUser = await getSessionUser();
  const address = sessionUser?.address?.trim()?.toLowerCase() || null;
  if (!address) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  let token: string;
  try {
    token = signBackendToken(address, 5 * 60);
  } catch (err) {
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

  try {
    const response = await fetch(backendTarget.toString(), {
      method,
      headers,
      body,
      cache: "no-store",
    });

    const text = await response.text();
    return new NextResponse(text || "{}", {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "application/json",
      },
    });
  } catch {
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
