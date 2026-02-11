"use client";

import { AutoConnect } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { getDotPayNetwork, getDotPayUsdcChain } from "@/lib/dotpayNetwork";
import { getDotPayAccountAbstraction } from "@/lib/thirdwebAccountAbstraction";
import { thirdwebClient } from "@/lib/thirdwebClient";

const dotpayNetwork = getDotPayNetwork();
const chain = getDotPayUsdcChain(dotpayNetwork);
const accountAbstraction = getDotPayAccountAbstraction(chain);

// Keep these stable (module-level) so AutoConnect doesn't re-run on every render.
const wallets = [
  inAppWallet({
    auth: {
      options: ["google", "email", "phone"],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
];

const appMetadata = {
  name: "DotPay",
  url: "https://app.dotpay.xyz",
  description: "Stablecoin wallet for fast crypto payments.",
  logoUrl: "https://app.dotpay.xyz/icons/icon-192x192.png",
};

/**
 * Ensures the last-connected wallet is automatically re-connected on app refresh/revisit.
 *
 * ConnectButton includes auto-connect logic, but it only runs on pages where the button is mounted.
 * We mount this globally so pages like /home and /send can reliably access useActiveAccount().
 */
export function ThirdwebAutoConnect() {
  return (
    <AutoConnect
      client={thirdwebClient}
      wallets={wallets}
      chain={chain}
      accountAbstraction={accountAbstraction}
      timeout={4000}
      appMetadata={appMetadata}
    />
  );
}
