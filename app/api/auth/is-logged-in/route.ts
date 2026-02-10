import { NextResponse } from "next/server";
import { isLoggedIn } from "@/app/(auth)/actions/login";

export async function GET() {
  const loggedIn = await isLoggedIn();
  return NextResponse.json({ loggedIn });
}

