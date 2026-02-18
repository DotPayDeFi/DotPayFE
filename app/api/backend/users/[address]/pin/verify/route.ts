import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/(auth)/actions/login";
import { signBackendToken } from "@/lib/backendAuthToken";

function getBackendUrl() {
  return (process.env.NEXT_PUBLIC_DOTPAY_API_URL || "").trim().replace(/\/+$/, "");
}

export async function POST(request: NextRequest, { params }: { params: { address: string } }) {
  const backendUrl = getBackendUrl();
  if (!backendUrl) {
    return NextResponse.json(
      { success: false, message: "NEXT_PUBLIC_DOTPAY_API_URL is not configured." },
      { status: 500 }
    );
  }

  const sessionUser = await getSessionUser();
  const sessionAddress = sessionUser?.address?.trim()?.toLowerCase() || null;
  if (!sessionAddress) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const normalized = String(params.address || "").trim().toLowerCase();
  if (!normalized) {
    return NextResponse.json({ success: false, message: "address is required." }, { status: 400 });
  }
  if (normalized !== sessionAddress) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  let token: string;
  try {
    token = signBackendToken(sessionAddress, 5 * 60);
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Token signing failed." },
      { status: 500 }
    );
  }

  const textBody = await request.text();
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (textBody) headers["Content-Type"] = "application/json";

  try {
    const res = await fetch(`${backendUrl}/api/users/${encodeURIComponent(normalized)}/pin/verify`, {
      method: "POST",
      headers,
      body: textBody || undefined,
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

