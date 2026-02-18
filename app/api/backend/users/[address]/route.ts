import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/(auth)/actions/login";

function getBackendUrl() {
  return (process.env.NEXT_PUBLIC_DOTPAY_API_URL || "").trim().replace(/\/+$/, "");
}

export async function GET(request: NextRequest, { params }: { params: { address: string } }) {
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

  // Only allow reading your own profile via this proxy.
  if (normalized !== sessionAddress) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const res = await fetch(`${backendUrl}/api/users/${encodeURIComponent(normalized)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
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

