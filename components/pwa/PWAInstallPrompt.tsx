"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone, Monitor, Tablet } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ onInstall, onDismiss }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop' | 'tablet'>('desktop');

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      // Check for standalone mode (iOS)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }
      
      // Check for standalone mode (Android)
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return;
      }
      
      // Check if running as PWA
      if (window.location.protocol === 'https:' && window.location.hostname !== 'localhost') {
        const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                     (window.navigator as any).standalone ||
                     document.referrer.includes('android-app://');
        setIsInstalled(isPWA);
      }
    };

    // Detect device type
    const detectDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
        setDeviceType('mobile');
      } else if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    detectDevice();
    checkIfInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Check if user has previously dismissed the prompt
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const now = Date.now();
      const daysSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60 * 24);
      
      // Show prompt if not dismissed in the last 7 days and not installed
      if (!isInstalled && daysSinceDismissed > 7) {
        setShowInstallPrompt(true);
      }
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem('pwa-install-dismissed');
      onInstall?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show prompt after a delay if not installed and no deferred prompt
    const timer = setTimeout(() => {
      if (!isInstalled && !deferredPrompt) {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        const dismissedTime = dismissed ? parseInt(dismissed) : 0;
        const now = Date.now();
        const daysSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60 * 24);
        
        if (daysSinceDismissed > 7) {
          setShowInstallPrompt(true);
        }
      }
    }, 3000); // Show after 3 seconds

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, [isInstalled, deferredPrompt, onInstall]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowInstallPrompt(false);
        onInstall?.();
      } else {
        // User dismissed, remember for 7 days
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      }
      
      setDeferredPrompt(null);
    } else {
      // Fallback for browsers that don't support beforeinstallprompt
      // Show manual installation instructions
      setShowInstallPrompt(false);
      // You could show a modal with manual installation instructions here
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    onDismiss?.();
  };

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-8 h-8" />;
      case 'tablet':
        return <Tablet className="w-8 h-8" />;
      default:
        return <Monitor className="w-8 h-8" />;
    }
  };

  const getInstallInstructions = () => {
    switch (deviceType) {
      case 'mobile':
        return 'Tap the "Add to Home Screen" button in your browser menu';
      case 'tablet':
        return 'Tap the share button and select "Add to Home Screen"';
      default:
        return 'Click the install button in your browser address bar';
    }
  };

  if (isInstalled || !showInstallPrompt) {
    return null;
  }

  return (
    <Dialog open={showInstallPrompt} onOpenChange={setShowInstallPrompt}>
      <DialogContent className="sm:max-w-md bg-white border-2 border-[#0795B0]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getDeviceIcon()}
              <div>
                <DialogTitle className="text-lg font-bold text-[#0795B0]">
                  Install DotPay
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  Your secure stablecoin wallet
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-[#0795B0]/10 p-4 rounded-lg">
            <h3 className="font-semibold text-[#0795B0] mb-2">Why install DotPay?</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Lightning-fast stablecoin transactions</li>
              <li>• Secure offline wallet access</li>
              <li>• Instant transaction notifications</li>
              <li>• Native app performance</li>
              <li>• One-tap access from home screen</li>
            </ul>
          </div>

          {deferredPrompt ? (
            <Button
              onClick={handleInstall}
              className="w-full bg-[#0795B0] hover:bg-[#0795B0]/90 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Install App
            </Button>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">
                {getInstallInstructions()}
              </p>
              <Button
                onClick={handleDismiss}
                variant="outline"
                className="w-full"
              >
                Got it
              </Button>
            </div>
          )}

          <p className="text-xs text-gray-500 text-center">
            Install DotPay on your {deviceType} for the best stablecoin experience
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PWAInstallPrompt;
