import React, { useEffect, useState } from 'react';
import { useCrypto } from '../../hooks/useCrypto';
import { Copy, Check } from '@phosphor-icons/react';
import { useWallet } from '../../context/WalletContext';

export const ReceiveInfo: React.FC = () => {
  const { getReceiveInfo, receiveInfoData, receiveInfoLoading, receiveInfoError } = useCrypto();
  const { stellarWallet, hasStellarWallet } = useWallet();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    getReceiveInfo();
  }, [getReceiveInfo]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const CopyButton: React.FC<{ text: string; field: string; label: string }> = ({ text, field, label }) => (
    <div className="flex items-center justify-between p-3 bg-[#0A0E0E] border border-[#0795B0] rounded-md">
      <div className="flex-1">
        <p className="text-sm text-gray-400 mb-1">{label}</p>
        <p className="text-white font-mono text-sm break-all">{text}</p>
      </div>
      <button
        onClick={() => copyToClipboard(text, field)}
        className="ml-3 p-2 bg-[#0795B0] hover:bg-[#0684A0] rounded-md transition-colors duration-200"
        title={`Copy ${label}`}
      >
        {copiedField === field ? (
          <Check size={16} className="text-white" />
        ) : (
          <Copy size={16} className="text-white" />
        )}
      </button>
    </div>
  );

  if (receiveInfoLoading) {
    return (
      <div className="w-full">
        <div className="bg-[#0A0E0E] rounded-xl border border-[#0795B0] p-6 shadow-lg text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0795B0] mx-auto mb-3"></div>
          <p className="text-gray-300">Loading receive information...</p>
        </div>
      </div>
    );
  }

  if (receiveInfoError) {
    return (
      <div className="w-full">
        <div className="bg-[#0A0E0E] rounded-xl border border-red-500 p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-red-300 mb-4">❌ Error Loading Information</h2>
          <p className="text-gray-300">{receiveInfoError}</p>
        </div>
      </div>
    );
  }

  if (!receiveInfoData) {
    return (
      <div className="w-full">
        <div className="bg-[#0A0E0E] rounded-xl border border-[#0795B0] p-6 shadow-lg text-center">
          <p className="text-gray-300">No receive information available</p>
        </div>
      </div>
    );
  }

  const { data } = receiveInfoData;

  return (
    <div className="w-full">
      <div className="bg-[#0A0E0E] rounded-xl border border-[#0795B0] p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">Receive Crypto</h2>
        
        {/* Wallet Addresses */}
        <div className="mb-6 space-y-4">
          <h3 className="text-lg font-semibold text-white mb-3">💳 Your Wallet Addresses</h3>
          
          {/* EVM Wallet Address */}
          <div>
            <CopyButton
              text={data.walletAddress}
              field="wallet"
              label="EVM Wallet Address (Ethereum, Polygon, etc.)"
            />
          </div>

          {/* Stellar Wallet Address */}
          {hasStellarWallet && stellarWallet && (
            <div>
              <CopyButton
                text={stellarWallet.accountId}
                field="stellar-wallet"
                label="🌟 Stellar Wallet Address (XLM, USDC on Stellar)"
              />
            </div>
          )}
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <CopyButton
            text={data.phoneNumber}
            field="phone"
            label="Phone Number"
          />
          <CopyButton
            text={data.email}
            field="email"
            label="Email Address"
          />
        </div>

        {/* Supported Chains */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">🌐 Supported Blockchains</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {data.supportedChains.map((chain) => (
              <div
                key={chain.id}
                className="p-3 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-center"
              >
                <p className="text-sm font-medium text-white mb-1">{chain.name}</p>
                <p className="text-xs text-gray-400">ID: {chain.id}</p>
                <p className="text-xs text-gray-400">Chain ID: {chain.chainId}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="p-4 bg-[#1A1E1E] border border-[#0795B0] rounded-md">
          <p className="text-sm text-gray-300">
            💡 <strong>Note:</strong> {data.note}
          </p>
        </div>

        {/* How to Receive */}
        <div className="mt-6 p-4 bg-[#1A1E1E] border border-[#0795B0] rounded-md">
          <h3 className="text-lg font-semibold text-white mb-3">📥 How to Receive Crypto</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p>1. <strong>Share your wallet address</strong> - Anyone can send crypto to your wallet address</p>
            <p>2. <strong>Share your phone/email</strong> - Others can send crypto using your contact info</p>
            <p>3. <strong>Select the right network</strong> - Make sure the sender uses a supported blockchain</p>
            <p>4. <strong>Check your wallet</strong> - Crypto will appear once the transaction is confirmed</p>
          </div>
        </div>

        {/* QR Code Placeholder */}
        <div className="mt-6 p-6 bg-[#1A1E1E] border border-[#0795B0] rounded-md text-center">
          <div className="w-32 h-32 bg-gray-700 rounded-lg mx-auto mb-3 flex items-center justify-center">
            <span className="text-gray-400 text-xs">QR Code</span>
          </div>
          <p className="text-sm text-gray-400">
            QR code for easy sharing (coming soon)
          </p>
        </div>
      </div>
    </div>
  );
};
