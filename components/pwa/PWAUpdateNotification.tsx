"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, X, Download } from 'lucide-react';

interface PWAUpdateNotificationProps {
  onUpdate?: () => void;
  onDismiss?: () => void;
}

const PWAUpdateNotification: React.FC<PWAUpdateNotificationProps> = ({ onUpdate, onDismiss }) => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    let registration: ServiceWorkerRegistration | null | undefined = null;

    const checkForUpdates = async () => {
      if ('serviceWorker' in navigator) {
        try {
          registration = await navigator.serviceWorker.getRegistration();
          
          if (registration) {
            // Check for updates
            await registration.update();
            
            // Listen for waiting service worker
            registration.addEventListener('updatefound', () => {
              const newWorker = registration?.installing;
              
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New content is available
                    setUpdateAvailable(true);
                    setShowUpdatePrompt(true);
                  }
                });
              }
            });
          }
        } catch (error) {
          console.log('Service worker update check failed:', error);
        }
      }
    };

    // Check for updates on load
    checkForUpdates();

    // Check for updates every 30 minutes
    const updateInterval = setInterval(checkForUpdates, 30 * 60 * 1000);

    // Listen for service worker messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        setUpdateAvailable(true);
        setShowUpdatePrompt(true);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      clearInterval(updateInterval);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration && registration.waiting) {
          // Tell the waiting service worker to skip waiting and become active
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
          // Reload the page to use the new service worker
          window.location.reload();
        }
      }
      
      setShowUpdatePrompt(false);
      setUpdateAvailable(false);
      onUpdate?.();
    } catch (error) {
      console.error('Update failed:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    onDismiss?.();
  };

  if (!showUpdatePrompt || !updateAvailable) {
    return null;
  }

  return (
    <Dialog open={showUpdatePrompt} onOpenChange={setShowUpdatePrompt}>
      <DialogContent className="sm:max-w-md bg-white border-2 border-green-500">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Download className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-green-600">
                  Update Available
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  A new version of DotPay is ready
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
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">What&apos;s new in this update?</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Performance improvements</li>
              <li>• Bug fixes and stability enhancements</li>
              <li>• New features and security updates</li>
              <li>• Better user experience</li>
            </ul>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Update Now
                </>
              )}
            </Button>
            
            <Button
              onClick={handleDismiss}
              variant="outline"
              disabled={isUpdating}
              className="flex-1"
            >
              Later
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            The update will be applied automatically and the app will reload
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PWAUpdateNotification;
