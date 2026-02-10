import { arbitrum, arbitrumSepolia, base, celo, polygon } from "thirdweb/chains";
import type { Chain } from "thirdweb/chains";

export type DotPayNetwork = "mainnet" | "sepolia";

/**
 * Determines which network the app should use.
 *
 * By default:
 * - dev: Arbitrum Sepolia
 * - prod: Arbitrum One
 *
 * Override by setting `NEXT_PUBLIC_DOTPAY_NETWORK` to `sepolia` or `mainnet`.
 */
export function getDotPayNetwork(): DotPayNetwork {
  const raw = (process.env.NEXT_PUBLIC_DOTPAY_NETWORK || "").trim().toLowerCase();
  if (raw === "sepolia" || raw === "testnet") return "sepolia";
  if (raw === "mainnet" || raw === "production" || raw === "prod") return "mainnet";
  return process.env.NODE_ENV !== "production" ? "sepolia" : "mainnet";
}

export function getDotPayUsdcChain(network: DotPayNetwork) {
  return network === "sepolia" ? arbitrumSepolia : arbitrum;
}

export function getDotPaySupportedChains(network: DotPayNetwork): Chain[] {
  return network === "sepolia" ? [arbitrumSepolia] : [arbitrum, base, celo, polygon];
}

