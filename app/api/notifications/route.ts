import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/(auth)/actions/login";

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  const address = sessionUser?.address?.trim()?.toLowerCase() || null;

  if (!address) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
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

  const { searchParams } = new URL(req.url);
  const limitParam = Number.parseInt(searchParams.get("limit") || "20", 10);
  const before = (searchParams.get("before") || "").trim();
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 20;

  const url = new URL(`${backendUrl}/api/notifications`);
  url.searchParams.set("address", address);
  url.searchParams.set("limit", String(limit));
  if (before) url.searchParams.set("before", before);

  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { "X-DotPay-Internal-Key": internalKey },
    });
    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: payload?.message || "Failed to load notifications." },
        { status: 502 }
      );
    }

    if (!payload?.success) {
      return NextResponse.json(
        { success: false, message: payload?.message || "Failed to load notifications." },
        { status: 502 }
      );
    }

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to load notifications." },
      { status: 502 }
    );
  }
}
