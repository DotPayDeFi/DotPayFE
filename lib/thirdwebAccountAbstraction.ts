import type { Chain } from "thirdweb/chains";
import type { SmartWalletOptions } from "thirdweb/wallets";
import { getDotPayNetwork, getDotPayUsdcChain } from "@/lib/dotpayNetwork";

const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

export function isDotPayGasSponsorshipEnabled() {
  const raw = (process.env.NEXT_PUBLIC_DOTPAY_SPONSORED_GAS || "").trim().toLowerCase();
  if (!raw) return true;
  return !FALSE_VALUES.has(raw);
}

/**
 * ERC-4337 smart account config used by thirdweb Connect UI and auto-connect.
 * Set NEXT_PUBLIC_DOTPAY_SPONSORED_GAS=false to disable at runtime.
 */
export function getDotPayAccountAbstraction(chain?: Chain): SmartWalletOptions | undefined {
  if (!isDotPayGasSponsorshipEnabled()) return undefined;

  return {
    chain: chain ?? getDotPayUsdcChain(getDotPayNetwork()),
    sponsorGas: true,
  };
}

