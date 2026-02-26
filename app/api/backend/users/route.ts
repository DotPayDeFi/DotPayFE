import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/(auth)/actions/login";
import { signBackendToken } from "@/lib/backendAuthToken";

function getBackendUrl() {
  return (process.env.NEXT_PUBLIC_DOTPAY_API_URL || "").trim().replace(/\/+$/, "");
}

export async function POST(request: NextRequest) {
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

  // We intentionally ignore any client-provided address and sync the authenticated session user.
  const body = JSON.stringify({
    address,
    email: sessionUser?.email ?? undefined,
    phone: sessionUser?.phone ?? undefined,
    userId: sessionUser?.userId ?? undefined,
    authMethod: sessionUser?.authMethod ?? undefined,
    createdAt: sessionUser?.createdAt ?? undefined,
  });

  try {
    const res = await fetch(`${backendUrl}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
      cache: "no-store",
    });

    const text = await res.text();
    return new NextResponse(text || "{}", {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to reach backend users service." }, { status: 502 });
  }
}
