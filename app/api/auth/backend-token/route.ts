import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/(auth)/actions/login";
import { signBackendToken } from "@/lib/backendAuthToken";

export async function GET() {
  const sessionUser = await getSessionUser();
  const address = sessionUser?.address?.trim()?.toLowerCase() || null;

  if (!address) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const token = signBackendToken(address, 5 * 60);
    return NextResponse.json(
      {
        success: true,
        data: {
          token,
          tokenType: "Bearer",
          expiresIn: 300,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Failed to mint backend token.",
      },
      { status: 500 }
    );
  }
}
