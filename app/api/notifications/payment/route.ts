import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/(auth)/actions/login";

const USDC_ADDRESSES = {
  mainnet: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  sepolia: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
} as const;

const CHAIN_IDS = {
  mainnet: 42161, // Arbitrum One
  sepolia: 421614, // Arbitrum Sepolia
} as const;

type Network = keyof typeof CHAIN_IDS;

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;

// keccak256("Transfer(address,address,uint256)")
const ERC20_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function getNetwork(): Network {
  const raw = (process.env.NEXT_PUBLIC_DOTPAY_NETWORK || "").trim().toLowerCase();
  if (raw === "sepolia" || raw === "testnet") return "sepolia";
  if (raw === "mainnet" || raw === "prod" || raw === "production") return "mainnet";
  return process.env.NODE_ENV !== "production" ? "sepolia" : "mainnet";
}

const normalizeAddress = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const normalizeTxHash = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const normalizeNote = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.length > 180 ? trimmed.slice(0, 180) : trimmed;
};

const topicToAddress = (topic: unknown) => {
  if (typeof topic !== "string") return null;
  const t = topic.toLowerCase();
  if (!t.startsWith("0x") || t.length !== 66) return null;
  return `0x${t.slice(-40)}`;
};

const hexToNumber = (hex: unknown) => {
  if (typeof hex !== "string") return null;
  try {
    return Number.parseInt(hex, 16);
  } catch {
    return null;
  }
};

const hexToBigIntString = (hex: unknown) => {
  if (typeof hex !== "string") return null;
  try {
    return BigInt(hex).toString();
  } catch {
    return null;
  }
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  const fromAddress = sessionUser?.address?.trim()?.toLowerCase() || null;

  if (!fromAddress) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const toAddress = normalizeAddress(body?.toAddress ?? body?.to);
  const txHash = normalizeTxHash(body?.txHash ?? body?.hash);
  const note = normalizeNote(body?.note);

  if (!toAddress || !ETH_ADDRESS_REGEX.test(toAddress)) {
    return NextResponse.json({ success: false, message: "Invalid recipient address." }, { status: 400 });
  }

  if (!txHash || !TX_HASH_REGEX.test(txHash)) {
    return NextResponse.json({ success: false, message: "Invalid transaction hash." }, { status: 400 });
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

  const apiKey =
    (process.env.ARBISCAN_API_KEY || "").trim() ||
    (process.env.ETHERSCAN_API_KEY || "").trim();

  if (!apiKey) {
    return NextResponse.json(
      { success: false, message: "ARBISCAN_API_KEY is not configured." },
      { status: 500 }
    );
  }

  const network = getNetwork();
  const chainId = CHAIN_IDS[network];
  const usdcAddress = USDC_ADDRESSES[network].toLowerCase();

  const receiptUrl = new URL("https://api.etherscan.io/v2/api");
  receiptUrl.searchParams.set("chainid", String(chainId));
  receiptUrl.searchParams.set("module", "proxy");
  receiptUrl.searchParams.set("action", "eth_getTransactionReceipt");
  receiptUrl.searchParams.set("txhash", txHash);
  receiptUrl.searchParams.set("apikey", apiKey);

  let receipt: any = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const res = await fetch(receiptUrl, { method: "GET", cache: "no-store" }).catch(() => null);
    // eslint-disable-next-line no-await-in-loop
    const payload = res ? await res.json().catch(() => null) : null;
    const result = payload?.result ?? null;
    if (result) {
      receipt = result;
      break;
    }
    // wait a bit; receipt might not be ready immediately after broadcast
    // eslint-disable-next-line no-await-in-loop
    await wait(900);
  }

  if (!receipt) {
    return NextResponse.json(
      { success: false, message: "Transaction receipt not available yet. Try again in a few seconds." },
      { status: 409 }
    );
  }

  if (String(receipt.status || "").toLowerCase() !== "0x1") {
    return NextResponse.json(
      { success: false, message: "Transaction failed on-chain." },
      { status: 400 }
    );
  }

  const logs: any[] = Array.isArray(receipt.logs) ? receipt.logs : [];
  const transferLog = logs.find((log) => {
    const addr = String(log?.address || "").toLowerCase();
    if (addr !== usdcAddress) return false;
    const topics = Array.isArray(log?.topics) ? log.topics : [];
    if (!topics[0] || String(topics[0]).toLowerCase() !== ERC20_TRANSFER_TOPIC) return false;
    const from = topicToAddress(topics[1]);
    const to = topicToAddress(topics[2]);
    return from === fromAddress && to === toAddress;
  });

  if (!transferLog) {
    return NextResponse.json(
      {
        success: false,
        message: "No matching USDC transfer found for this transaction.",
      },
      { status: 400 }
    );
  }

  const value = hexToBigIntString(transferLog.data);
  const logIndex = hexToNumber(transferLog.logIndex);
  const blockNumber = String(receipt.blockNumber || "");

  if (!value || !/^[0-9]+$/.test(value)) {
    return NextResponse.json({ success: false, message: "Invalid transfer amount." }, { status: 400 });
  }

  if (typeof logIndex !== "number" || !Number.isFinite(logIndex) || logIndex < 0) {
    return NextResponse.json({ success: false, message: "Invalid log index." }, { status: 400 });
  }

  let eventAt = new Date().toISOString();
  const blockTag = typeof blockNumber === "string" && blockNumber.startsWith("0x") ? blockNumber : null;
  if (blockTag) {
    const blockUrl = new URL("https://api.etherscan.io/v2/api");
    blockUrl.searchParams.set("chainid", String(chainId));
    blockUrl.searchParams.set("module", "proxy");
    blockUrl.searchParams.set("action", "eth_getBlockByNumber");
    blockUrl.searchParams.set("tag", blockTag);
    blockUrl.searchParams.set("boolean", "false");
    blockUrl.searchParams.set("apikey", apiKey);

    try {
      const res = await fetch(blockUrl, { method: "GET", cache: "no-store" });
      const payload = await res.json().catch(() => null);
      const tsHex = payload?.result?.timestamp;
      const ts = hexToNumber(tsHex);
      if (typeof ts === "number" && Number.isFinite(ts) && ts > 0) {
        eventAt = new Date(ts * 1000).toISOString();
      }
    } catch {
      // keep fallback (now)
    }
  }

  const backendRes = await fetch(`${backendUrl}/api/notifications/payment`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-DotPay-Internal-Key": internalKey,
    },
    body: JSON.stringify({
      toAddress,
      fromAddress,
      type: "payment_received",
      chainId,
      contractAddress: usdcAddress,
      txHash,
      logIndex,
      value,
      tokenSymbol: "USDC",
      tokenDecimal: 6,
      note,
      eventAt,
    }),
  }).catch(() => null);

  const backendPayload = backendRes ? await backendRes.json().catch(() => null) : null;

  if (!backendRes || !backendRes.ok || !backendPayload?.success) {
    return NextResponse.json(
      { success: false, message: backendPayload?.message || "Failed to deliver notification." },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { success: true, message: "OK", data: backendPayload.data ?? null },
    { status: 200 }
  );
}
