import { NextResponse } from "next/server";

function getBackendUrl() {
  return (process.env.NEXT_PUBLIC_DOTPAY_API_URL || "").trim().replace(/\/+$/, "");
}

export async function GET() {
  const backendUrl = getBackendUrl();
  if (!backendUrl) {
    return NextResponse.json(
      { success: false, message: "NEXT_PUBLIC_DOTPAY_API_URL is not configured." },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`${backendUrl}/health`, { method: "GET", cache: "no-store" });
    const text = await res.text();
    return new NextResponse(text || "{}", {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to reach backend service." }, { status: 502 });
  }
}

