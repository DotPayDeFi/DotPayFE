import React, { Dispatch, SetStateAction } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import dynamic from "next/dynamic";
import SuccessJson from "@/public/json/success.json";

// Dynamically import Player to avoid SSR issues
const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player),
  { ssr: false }
);

const TransactionSuccessDialog = ({
  openSuccess,
  setOpenSuccess,
  message,
  amount,
  currency,
  transactionCategory,
  transactionSubType,
  transactionHash,
  explorerUrl,
}: {
  openSuccess: boolean;
  setOpenSuccess: Dispatch<SetStateAction<boolean>>;
  message: string;
  amount: string;
  currency: string;
  transactionCategory?: 'onchain' | 'onramp' | 'offramp' | 'cardpayment';
  transactionSubType?: 'sent' | 'received' | 'swap';
  transactionHash?: string;
  explorerUrl?: string;
}) => {
  // Map transactionCategory to display labels
  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'onchain':
        return 'On-chain TX';
      case 'onramp':
        return 'Onramp';
      case 'offramp':
        return 'Offramp';
      case 'cardpayment':
        return 'Card Payment';
      default:
        return category || '';
    }
  };

  return (
    <Dialog open={openSuccess} onOpenChange={setOpenSuccess}>
      <DialogContent className="max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle className="mb-[5px]">{message}</DialogTitle>
          <DialogDescription>
            {amount}{" "}
            {currency?.toUpperCase()}
          </DialogDescription>
          <Player
            keepLastFrame
            autoplay
            src={SuccessJson}
            style={{ height: "200px", width: "200px" }}
          ></Player>
          {(transactionCategory || transactionSubType || transactionHash) && (
            <div className="mt-4 space-y-3 text-left">
              {(transactionCategory || transactionSubType) && (
                <div className="flex flex-wrap items-center gap-2">
                  {transactionCategory && (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400">
                      {getCategoryLabel(transactionCategory)}
                    </span>
                  )}
                  {transactionSubType && (
                    <span className="inline-flex items-center rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-400 capitalize">
                      {transactionSubType}
                    </span>
                  )}
                </div>
              )}
              {transactionHash && (
                <div className="rounded-md bg-black/30 p-3 border border-gray-700/50">
                  <div className="text-xs text-gray-300 mb-2 font-medium">Transaction Hash</div>
                  <div className="flex items-start gap-2">
                    <code className="flex-1 min-w-0 text-[11px] leading-relaxed text-gray-200 break-all word-break-all overflow-wrap-anywhere">
                      {transactionHash}
                    </code>
                    {explorerUrl && (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 ml-2 text-xs text-aqua hover:underline whitespace-nowrap"
                      >
                        View
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionSuccessDialog;
