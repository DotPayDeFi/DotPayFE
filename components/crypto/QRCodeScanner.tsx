"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { PayBusinessForm } from './PayBusinessForm';
import { 
  QrCode, 
  Camera, 
  X, 
  AlertCircle,
  CheckCircle,
  Building2
} from 'lucide-react';

interface BusinessQRData {
  type: 'business_payment';
  businessName: string;
  merchantId: string;
  walletAddress: string;
  businessType: string;
  phoneNumber: string;
  timestamp: string;
}

interface QRCodeScannerProps {
  onClose?: () => void;
  onScanSuccess?: (data: BusinessQRData) => void;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ 
  onClose, 
  onScanSuccess 
}) => {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<BusinessQRData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPayForm, setShowPayForm] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Parse QR code data
  const parseQRData = (qrString: string): BusinessQRData | null => {
    try {
      const data = JSON.parse(qrString);
      
      // Validate the QR code data structure
      if (data.type === 'business_payment' && 
          data.businessName && 
          data.merchantId && 
          data.walletAddress) {
        return data as BusinessQRData;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to parse QR code data:', error);
      return null;
    }
  };

  // Start camera for scanning
  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      // Simulate QR code detection (in a real app, you'd use a QR code library)
      // For now, we'll show a manual input option
      toast({
        title: "Camera Started",
        description: "Point your camera at a business QR code",
      });
      
    } catch (error: any) {
      console.error('Error starting camera:', error);
      setError('Failed to access camera. Please check permissions.');
      setIsScanning(false);
    }
  };

  // Stop camera
  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // Manual QR code input (fallback)
  const handleManualInput = () => {
    const qrString = prompt('Enter QR code data (JSON string):');
    if (qrString) {
      const data = parseQRData(qrString);
      if (data) {
        setScannedData(data);
        setShowPayForm(true);
        if (onScanSuccess) {
          onScanSuccess(data);
        }
      } else {
        toast({
          title: "Invalid QR Code",
          description: "The QR code data is not valid",
          variant: "destructive",
        });
      }
    }
  };

  // Simulate successful scan (for demo purposes)
  const simulateScan = () => {
    const mockData: BusinessQRData = {
      type: 'business_payment',
      businessName: 'Demo Business',
      merchantId: 'DEMO123',
      walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      businessType: 'restaurant',
      phoneNumber: '+254712345678',
      timestamp: new Date().toISOString()
    };
    
    setScannedData(mockData);
    setShowPayForm(true);
    if (onScanSuccess) {
      onScanSuccess(mockData);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  if (showPayForm && scannedData) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <h2 className="text-xl font-bold text-white">QR Code Scanned</h2>
            </div>
            <Button
              onClick={() => {
                setShowPayForm(false);
                setScannedData(null);
              }}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <PayBusinessForm 
            qrData={scannedData} 
            onSuccess={() => {
              setShowPayForm(false);
              setScannedData(null);
              if (onClose) onClose();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0E0E] border border-[#0795B0] rounded-lg p-6 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0795B0]/20 rounded-lg">
              <QrCode className="h-6 w-6 text-[#0795B0]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Scan QR Code</h2>
              <p className="text-sm text-gray-400">Scan a business QR code to pay</p>
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

        {/* Camera Preview */}
        <div className="mb-6">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-square">
            {isScanning ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Camera not started</p>
                </div>
              </div>
            )}
            
            {/* QR Code Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-[#0795B0] rounded-lg border-dashed opacity-50">
                <div className="w-full h-full flex items-center justify-center">
                  <QrCode className="h-8 w-8 text-[#0795B0]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isScanning ? (
            <Button
              onClick={startScanning}
              className="w-full bg-[#0795B0] hover:bg-[#0684A0] text-white"
            >
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </Button>
          ) : (
            <Button
              onClick={stopScanning}
              variant="outline"
              className="w-full border-[#0795B0] text-[#0795B0] hover:bg-[#0795B0] hover:text-white"
            >
              Stop Camera
            </Button>
          )}
          
          <Button
            onClick={handleManualInput}
            variant="outline"
            className="w-full border-[#0795B0] text-[#0795B0] hover:bg-[#0795B0] hover:text-white"
          >
            Enter QR Code Manually
          </Button>
          
          {/* Demo button for testing */}
          <Button
            onClick={simulateScan}
            variant="outline"
            className="w-full border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Demo: Scan Test QR Code
          </Button>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-[#0795B0]/5 border border-[#0795B0]/20 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">How to scan:</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Point your camera at a business QR code</li>
            <li>• The QR code should contain business payment information</li>
            <li>• Once scanned, you&apos;ll be able to make a payment</li>
            <li>• Make sure you have good lighting</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
