import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/(auth)/actions/login";

export async function POST(_: Request, context: { params: { id: string } }) {
  const sessionUser = await getSessionUser();
  const address = sessionUser?.address?.trim()?.toLowerCase() || null;

  if (!address) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const id = String(context?.params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ success: false, message: "Invalid id." }, { status: 400 });
  }

  const backendUrl = (process.env.NEXT_PUBLIC_DOTPAY_API_URL || "").trim().replace(/\/+$/, "");
  const internalKey = (process.env.DOTPAY_INTERNAL_API_KEY || "").trim();

  if (!backendUrl) {
    return NextResponse.json(
      { success: false, message: "Backend API is not configured." },
      { status: 500 }
    );
  }

  if (!internalKey) {
    return NextResponse.json(
      { success: false, message: "DOTPAY_INTERNAL_API_KEY is not configured." },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${backendUrl}/api/notifications/${encodeURIComponent(id)}/read`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-DotPay-Internal-Key": internalKey,
      },
      body: JSON.stringify({ address }),
    });
    const payload = await res.json().catch(() => null);

    if (!res.ok || !payload?.success) {
      return NextResponse.json(
        { success: false, message: payload?.message || "Failed to mark notification as read." },
        { status: 502 }
      );
    }

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to mark notification as read." },
      { status: 502 }
    );
  }
}
