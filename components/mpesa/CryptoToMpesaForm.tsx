"use client";

import React, { useMemo, useState } from "react";
import { getContract, waitForReceipt } from "thirdweb";
import { getBalance, transfer } from "thirdweb/extensions/erc20";
import { useActiveAccount, useConnectModal, useIsAutoConnecting, useReadContract, useSendTransaction } from "thirdweb/react";
import { toUnits } from "thirdweb/utils";
import { useMpesa } from "../../hooks/useMpesa";
import { useGetConversionRate } from "@/hooks/apiHooks";
import { getDotPayNetwork, getDotPayUsdcChain } from "@/lib/dotpayNetwork";
import { thirdwebClient } from "@/lib/thirdwebClient";

// Circle's official USDC (proxy) on Arbitrum Sepolia.
const USDC_ARBITRUM_SEPOLIA_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as const;
// Circle native USDC on Arbitrum One (mainnet).
const USDC_ARBITRUM_ONE_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as const;
const USDC_DECIMALS = 6;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const shortAddress = (value: string) => `${value.slice(0, 6)}...${value.slice(-4)}`;

export const CryptoToMpesaForm: React.FC = () => {
  const { cryptoToMpesa, cryptoToMpesaLoading } = useMpesa();
  const { data: rate, isLoading: rateLoading } = useGetConversionRate();
  const account = useActiveAccount();
  const isAutoConnecting = useIsAutoConnecting();
  const { connect, isConnecting } = useConnectModal();

  const dotpayNetwork = getDotPayNetwork();
  const chain = getDotPayUsdcChain(dotpayNetwork);
  const chainLabel = dotpayNetwork === "sepolia" ? "Arbitrum Sepolia" : "Arbitrum";
  const chainCode = dotpayNetwork === "sepolia" ? "arbitrum-sepolia" : "arbitrum";
  const usdcAddress = dotpayNetwork === "sepolia" ? USDC_ARBITRUM_SEPOLIA_ADDRESS : USDC_ARBITRUM_ONE_ADDRESS;
  const treasuryAddress = String(process.env.NEXT_PUBLIC_TREASURY_PLATFORM_ADDRESS || "").trim();

  const { mutateAsync: sendTx, isPending: isSendingTx } = useSendTransaction({ payModal: false });

  const usdcContract = useMemo(
    () =>
      getContract({
        client: thirdwebClient,
        chain,
        address: usdcAddress,
      }),
    [chain, usdcAddress]
  );

  const {
    data: usdcBalance,
    isLoading: usdcBalanceLoading,
    refetch: refetchUsdcBalance,
  } = useReadContract(getBalance, {
    contract: usdcContract,
    address: account?.address ?? ZERO_ADDRESS,
    queryOptions: {
      enabled: Boolean(account?.address),
    },
  });

  const [formData, setFormData] = useState({
    amount: "", // Amount in KES
    recipientPhone: "",
    tokenType: "USDC",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [failure, setFailure] = useState<any>(null);

  const kesPerUsd = rate ?? 130;

  const amountKes = useMemo(() => {
    const parsed = Number.parseFloat(formData.amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Number(parsed.toFixed(2));
  }, [formData.amount]);

  const usdcAmount = useMemo(() => {
    if (!amountKes) return null;
    if (!Number.isFinite(kesPerUsd) || kesPerUsd <= 0) return null;
    return Number((amountKes / kesPerUsd).toFixed(6));
  }, [amountKes, kesPerUsd]);

  const availableUsdc = useMemo(() => {
    const raw = usdcBalance?.displayValue;
    if (!raw) return 0;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [usdcBalance?.displayValue]);

  const insufficientUsdc = useMemo(() => {
    if (!usdcAmount) return false;
    return availableUsdc < usdcAmount;
  }, [availableUsdc, usdcAmount]);

  const isBusy = processing || cryptoToMpesaLoading || isSendingTx;

  const handleConnectWallet = async () => {
    try {
      await connect({
        client: thirdwebClient,
        chain,
        chains: [chain],
        showAllWallets: false,
        size: "compact",
        theme: "dark",
        title: "Reconnect your account",
      });
    } catch {
      // user closed modal
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setFailure(null);

    if (!account?.address) {
      setError("Connect your wallet first.");
      return;
    }

    if (!treasuryAddress) {
      setError("NEXT_PUBLIC_TREASURY_PLATFORM_ADDRESS is not configured.");
      return;
    }

    if (!confirm) {
      setError("Please confirm the transaction before proceeding.");
      return;
    }

    if (!amountKes || amountKes < 10) {
      setError("Enter a valid amount in KES (minimum 10).");
      return;
    }

    if (!usdcAmount || usdcAmount <= 0) {
      setError("Failed to calculate USDC amount from KES.");
      return;
    }

    if (insufficientUsdc) {
      setError(`Insufficient USDC. Required ${usdcAmount}, available ${availableUsdc.toFixed(6)}.`);
      return;
    }

    const phone = formData.recipientPhone.trim();
    if (!phone) {
      setError("Recipient phone number is required.");
      return;
    }

    setProcessing(true);

    try {
      const amountWei = toUnits(usdcAmount.toFixed(6), usdcBalance?.decimals ?? USDC_DECIMALS);

      // Step 1: transfer USDC from user wallet to treasury on-chain.
      const tx = transfer({
        contract: usdcContract,
        to: treasuryAddress,
        amountWei,
      });

      const txResult = await sendTx(tx);

      // Wait for confirmation so backend receives an actual settled funding tx hash.
      await waitForReceipt({
        chain,
        client: thirdwebClient,
        transactionHash: txResult.transactionHash,
      });

      // Step 2: trigger M-Pesa B2C payout in KES.
      const response = await cryptoToMpesa({
        amount: amountKes,
        phone,
        tokenType: formData.tokenType,
        chain: chainCode,
        usdcAmount,
        treasuryTransferHash: txResult.transactionHash,
        treasuryAddress,
        description: formData.description,
      });

      if (response.success) {
        setResult({
          ...response.data,
          treasuryTransferHash: txResult.transactionHash,
          treasuryAddress,
          usdcAmount,
          kesAmount: amountKes,
          chain: chainCode,
        });

        setFormData({
          amount: "",
          recipientPhone: "",
          tokenType: "USDC",
          description: "",
        });
        setConfirm(false);
        refetchUsdcBalance();
      } else {
        setFailure({ message: response.message, error: (response as any).error, data: response.data });
      }
    } catch (err: any) {
      setFailure({
        message: err?.response?.data?.message || err?.message || "Transaction failed",
        error: err,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-[#0A0E0E] border border-[#0795B0] rounded-lg">
      <h2 className="text-xl font-bold text-white mb-2">Withdraw to M-Pesa</h2>
      <p className="text-sm text-gray-300 mb-6">
        Amount is entered in KES. We first transfer USDC to treasury, then send M-Pesa to your phone.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-md border border-[#0795B0] bg-[#1A1E1E] p-3 text-xs text-gray-300">
          <p>
            Network: <span className="text-white">{chainLabel}</span>
          </p>
          <p>
            Treasury: <span className="text-white font-mono">{treasuryAddress ? shortAddress(treasuryAddress) : "Not set"}</span>
          </p>
          <p>
            Wallet balance: <span className="text-white">{usdcBalanceLoading ? "Loading..." : `${availableUsdc.toFixed(6)} USDC`}</span>
          </p>
        </div>

        {!account?.address && (
          <button
            type="button"
            onClick={handleConnectWallet}
            disabled={isConnecting || isAutoConnecting}
            className="w-full py-2 px-3 rounded-md border border-[#0795B0] bg-[#1A1E1E] text-white hover:bg-[#222] disabled:opacity-60"
          >
            {isConnecting || isAutoConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-300">
            Amount (KES)
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0] text-white"
            placeholder="1000"
            step="1"
            min="10"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            {rateLoading ? "Loading rate..." : `Rate: 1 USDC ≈ ${kesPerUsd.toFixed(2)} KES`}
          </p>
          {usdcAmount && (
            <p className="text-xs text-cyan-300 mt-1">USDC to treasury: {usdcAmount.toFixed(6)} USDC</p>
          )}
        </div>

        <div>
          <label htmlFor="recipientPhone" className="block text-sm font-medium text-gray-300">
            Recipient Phone Number
          </label>
          <input
            type="tel"
            id="recipientPhone"
            name="recipientPhone"
            value={formData.recipientPhone}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0] text-white"
            placeholder="254712345678"
            required
          />
        </div>

        <div>
          <label htmlFor="tokenType" className="block text-sm font-medium text-gray-300">
            Token
          </label>
          <select
            id="tokenType"
            name="tokenType"
            value={formData.tokenType}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0] text-white"
          >
            <option value="USDC">USDC</option>
          </select>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300">
            Description (Optional)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 bg-[#1A1E1E] border border-[#0795B0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0795B0] text-white"
            placeholder="Withdrawal request"
            rows={2}
            maxLength={100}
          />
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="confirm"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
            className="w-4 h-4 text-[#0795B0] bg-[#1A1E1E] border-[#0795B0] rounded focus:ring-[#0795B0] focus:ring-2"
          />
          <label htmlFor="confirm" className="text-sm text-gray-300">
            I confirm this withdrawal to M-Pesa.
          </label>
        </div>

        {insufficientUsdc && (
          <div className="p-3 bg-red-900/20 border border-red-500 rounded-md text-sm text-red-300">
            Insufficient USDC balance for this withdrawal.
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500 rounded-md text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isBusy}
          className="w-full flex justify-center py-3 px-4 rounded-md text-sm font-semibold text-white bg-[#0795B0] hover:bg-[#0684A0] focus:outline-none focus:ring-2 focus:ring-[#0795B0] disabled:opacity-50"
        >
          {isBusy ? "Processing..." : "Transfer to Treasury & Send M-Pesa"}
        </button>
      </form>

      {result && (
        <div className="mt-6 p-6 bg-[#1A1E1E] border border-[#0795B0] rounded-md">
          <h3 className="text-lg font-semibold text-white mb-2">Withdrawal Initiated</h3>
          <div className="grid grid-cols-1 gap-2 text-sm text-gray-300">
            <div>
              <span className="text-gray-400">Transaction ID:</span> {result.transactionId}
            </div>
            <div>
              <span className="text-gray-400">M-Pesa Status:</span> {result.status}
            </div>
            <div>
              <span className="text-gray-400">KES Amount:</span> {result.kesAmount} KES
            </div>
            <div>
              <span className="text-gray-400">USDC Sent to Treasury:</span> {result.usdcAmount} USDC
            </div>
            <div>
              <span className="text-gray-400">Treasury Tx Hash:</span> <span className="font-mono text-xs">{result.treasuryTransferHash}</span>
            </div>
          </div>
        </div>
      )}

      {failure && (
        <div className="mt-6 p-6 bg-red-900/20 border border-red-500 rounded-md">
          <h3 className="text-lg font-semibold text-red-200 mb-2">Withdrawal Failed</h3>
          <p className="text-red-200 mb-2">{failure.message}</p>
        </div>
      )}
    </div>
  );
};
