import { NextResponse } from "next/server";
import { logout } from "@/app/(auth)/actions/login";

export async function POST() {
  await logout();
  return NextResponse.json({ success: true });
}

