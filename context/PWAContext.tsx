"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PWAContextType {
  isInstalled: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  installPrompt: any;
  showInstallPrompt: boolean;
  showUpdatePrompt: boolean;
  setShowInstallPrompt: (show: boolean) => void;
  setShowUpdatePrompt: (show: boolean) => void;
  triggerInstall: () => void;
  triggerUpdate: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

interface PWAProviderProps {
  children: ReactNode;
}

export const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
  const enableCustomInstallPrompt = process.env.NEXT_PUBLIC_ENABLE_PWA_INSTALL_PROMPT === 'true';
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  // In development, remove any previously registered service workers/caches
  // to prevent stale _next chunk URLs causing blank screens.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const cleanupDevServiceWorkers = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } catch {
        // no-op: cleanup best-effort only
      }
    };

    cleanupDevServiceWorkers();
  }, []);

  useEffect(() => {
    // Check if app is installed
    const checkInstallation = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      const isPWA = isStandalone || isIOSStandalone || document.referrer.includes('android-app://');
      setIsInstalled(isPWA);
    };

    // Check online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      if (!enableCustomInstallPrompt) return;
      e.preventDefault();
      setInstallPrompt(e);
      
      // Check if user has dismissed before
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const now = Date.now();
      const daysSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60 * 24);
      
      if (!isInstalled && daysSinceDismissed > 7) {
        setShowInstallPrompt(true);
      }
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setInstallPrompt(null);
      localStorage.removeItem('pwa-install-dismissed');
    };

    // Listen for service worker updates
    const handleServiceWorkerUpdate = async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration) {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setIsUpdateAvailable(true);
                  setShowUpdatePrompt(true);
                }
              });
            }
          });
        }
      }
    };

    // Initialize
    checkInstallation();
    updateOnlineStatus();
    handleServiceWorkerUpdate();

    // Event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Show install prompt after delay if not installed
    const timer = setTimeout(() => {
      if (!enableCustomInstallPrompt) return;
      if (!isInstalled && !installPrompt) {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        const dismissedTime = dismissed ? parseInt(dismissed) : 0;
        const now = Date.now();
        const daysSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60 * 24);
        
        if (daysSinceDismissed > 7) {
          setShowInstallPrompt(true);
        }
      }
    }, 5000); // Show after 5 seconds

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearTimeout(timer);
    };
  }, [enableCustomInstallPrompt]);

  const triggerInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowInstallPrompt(false);
      } else {
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
      }
      
      setInstallPrompt(null);
    }
  };

  const triggerUpdate = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  };

  const value: PWAContextType = {
    isInstalled,
    isOnline,
    isUpdateAvailable,
    installPrompt,
    showInstallPrompt,
    showUpdatePrompt,
    setShowInstallPrompt,
    setShowUpdatePrompt,
    triggerInstall,
    triggerUpdate,
  };

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  );
};
