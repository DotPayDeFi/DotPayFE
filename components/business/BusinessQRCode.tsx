"use client";

import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import { useBusiness } from '@/context/BusinessContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { 
  QrCode, 
  Copy, 
  Download, 
  Share2, 
  Building2,
  CreditCard,
  Wallet,
  X
} from 'lucide-react';

interface BusinessQRCodeProps {
  onClose?: () => void;
}

export const BusinessQRCode: React.FC<BusinessQRCodeProps> = ({ onClose }) => {
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const [showQR, setShowQR] = useState(false);

  if (!currentBusiness) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400">No business account selected</p>
      </div>
    );
  }

  // Create QR code data with business information
  const qrData = {
    type: 'business_payment',
    businessName: currentBusiness.businessName,
    merchantId: currentBusiness.merchantId,
    walletAddress: currentBusiness.walletAddress,
    businessType: currentBusiness.businessType,
    phoneNumber: currentBusiness.phoneNumber,
    timestamp: new Date().toISOString()
  };

  const qrString = JSON.stringify(qrData);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const downloadQR = () => {
    const canvas = document.getElementById('business-qr-code') as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${currentBusiness.businessName}-QR-Code.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const shareQR = async () => {
    if (navigator.share) {
      try {
        const canvas = document.getElementById('business-qr-code') as HTMLCanvasElement;
        if (canvas) {
          canvas.toBlob(async (blob) => {
            if (blob) {
              const file = new File([blob], `${currentBusiness.businessName}-QR-Code.png`, {
                type: 'image/png'
              });
              await navigator.share({
                title: `${currentBusiness.businessName} - Payment QR Code`,
                text: `Scan to pay ${currentBusiness.businessName}`,
                files: [file]
              });
            }
          });
        }
      } catch (error) {
        console.error('Error sharing:', error);
        toast({
          title: "Share Failed",
          description: "Could not share QR code",
          variant: "destructive",
        });
      }
    } else {
      // Fallback: copy QR data to clipboard
      copyToClipboard(qrString, 'QR Code Data');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0795B0]/20 rounded-lg">
              <QrCode className="h-6 w-6 text-[#0795B0]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Accept Payment</h2>
              <p className="text-sm text-gray-400">Share QR code for customers to pay</p>
            </div>
          </div>
          {onClose && (
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Business Info */}
        <div className="bg-[#0795B0]/5 border border-[#0795B0]/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Building2 className="h-5 w-5 text-[#0795B0]" />
            <h3 className="text-lg font-semibold text-white">{currentBusiness.businessName}</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Merchant ID:</span>
              <span className="text-white font-mono">{currentBusiness.merchantId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Business Type:</span>
              <span className="text-white capitalize">{currentBusiness.businessType.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Phone:</span>
              <span className="text-white">{currentBusiness.phoneNumber}</span>
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="text-center mb-6">
          <div className="bg-white p-4 rounded-lg inline-block">
            <QRCode
              id="business-qr-code"
              value={qrString}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          <p className="text-sm text-gray-400 mt-3">
            Customers can scan this QR code to pay your business
          </p>
        </div>

        {/* Wallet Address */}
        <div className="bg-[#1A1E1E] border border-[#0795B0]/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-[#0795B0]" />
            <span className="text-sm font-medium text-gray-300">Wallet Address</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white font-mono text-sm break-all">
              {currentBusiness.walletAddress.slice(0, 10)}...{currentBusiness.walletAddress.slice(-8)}
            </span>
            <Button
              onClick={() => copyToClipboard(currentBusiness.walletAddress, 'Wallet Address')}
              variant="ghost"
              size="sm"
              className="p-1 h-auto text-gray-400 hover:text-white"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={downloadQR}
            variant="outline"
            className="border-[#0795B0] text-[#0795B0] hover:bg-[#0795B0] hover:text-white bg-transparent"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            onClick={shareQR}
            variant="outline"
            className="border-[#0795B0] text-[#0795B0] hover:bg-[#0795B0] hover:text-white bg-transparent"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-[#0795B0]/5 border border-[#0795B0]/20 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">How it works:</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Customer scans QR code with their crypto wallet</li>
            <li>• Payment is sent directly to your business wallet</li>
            <li>• Transaction appears in your business transactions</li>
            <li>• No fees for receiving payments</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
