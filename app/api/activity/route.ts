import { NextResponse } from "next/server";

const USDC_ADDRESSES = {
  mainnet: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  sepolia: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
} as const;

const CHAIN_IDS = {
  mainnet: 42161, // Arbitrum One
  sepolia: 421614, // Arbitrum Sepolia
} as const;

type Network = keyof typeof CHAIN_IDS;

const isEvmAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const address = (searchParams.get("address") || "").trim();
  const networkParam = (searchParams.get("network") || "mainnet").trim().toLowerCase();
  const limitParam = Number.parseInt(searchParams.get("limit") || "10", 10);

  const network: Network = networkParam === "sepolia" ? "sepolia" : "mainnet";
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 25) : 10;

  if (!isEvmAddress(address)) {
    return NextResponse.json(
      { success: false, message: "Invalid address.", data: { transfers: [] } },
      { status: 400 }
    );
  }

  const apiKey =
    (process.env.ARBISCAN_API_KEY || "").trim() ||
    (process.env.ETHERSCAN_API_KEY || "").trim();

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message: "ARBISCAN_API_KEY is not configured.",
        data: { transfers: [] },
      },
      { status: 500 }
    );
  }

  const chainid = CHAIN_IDS[network];
  const contractaddress = USDC_ADDRESSES[network];

  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", String(chainid));
  url.searchParams.set("module", "account");
  url.searchParams.set("action", "tokentx");
  url.searchParams.set("contractaddress", contractaddress);
  url.searchParams.set("address", address);
  url.searchParams.set("page", "1");
  url.searchParams.set("offset", String(limit));
  url.searchParams.set("sort", "desc");
  url.searchParams.set("apikey", apiKey);

  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const payload = await res.json().catch(() => null);

    // Etherscan-family APIs return 200 even when "NOTOK".
    const status = String(payload?.status ?? "");
    const message = String(payload?.message ?? "");
    const result = payload?.result;

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: "Failed to load activity.", data: { transfers: [] } },
        { status: 502 }
      );
    }

    // "No transactions found" is a valid empty state. Anything else should surface as an error
    // so the UI can prompt a retry (rate limits, timeouts, invalid API key, etc).
    if (status !== "1") {
      const resultText = typeof result === "string" ? result : "";
      const isEmpty =
        resultText.toLowerCase().includes("no transactions found") ||
        message.toLowerCase().includes("no transactions found");

      if (isEmpty) {
        return NextResponse.json(
          {
            success: true,
            message: "No transactions found.",
            data: { transfers: [] },
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: message || resultText || "Activity unavailable.",
          data: { transfers: [] },
        },
        { status: 502 }
      );
    }

    const transfers = Array.isArray(result)
      ? result.map((t: any) => ({
          hash: String(t?.hash ?? ""),
          timeStamp: Number.parseInt(String(t?.timeStamp ?? "0"), 10),
          blockNumber: Number.parseInt(String(t?.blockNumber ?? "0"), 10),
          from: String(t?.from ?? ""),
          to: String(t?.to ?? ""),
          value: String(t?.value ?? "0"),
          tokenSymbol: String(t?.tokenSymbol ?? "USDC"),
          tokenDecimal: Number.parseInt(String(t?.tokenDecimal ?? "6"), 10),
        }))
      : [];

    return NextResponse.json(
      { success: true, message: "OK", data: { transfers } },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to load activity.", data: { transfers: [] } },
      { status: 502 }
    );
  }
}
