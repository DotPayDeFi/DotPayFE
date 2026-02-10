"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

interface GoogleConfigGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const GoogleConfigGuide: React.FC<GoogleConfigGuideProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Google Sign-In Configuration Guide</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-sm">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Configuration Required</h3>
            <p className="text-yellow-700">
              The Google OAuth client needs to be configured to allow your current domain.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Steps to fix this issue:</h4>
            
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                <div>
                  <p className="font-medium">Go to Google Cloud Console</p>
                  <p className="text-gray-600">Visit console.cloud.google.com</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                <div>
                  <p className="font-medium">Navigate to APIs & Services → Credentials</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                <div>
                  <p className="font-medium">Find your OAuth 2.0 Client ID</p>
                  <p className="text-gray-600">Look for the client ID starting with: 733823334129...</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">4</span>
                <div>
                  <p className="font-medium">Add Authorized Origins</p>
                  <div className="bg-gray-100 p-2 rounded mt-1 font-mono text-sm">
                    http://localhost:3000
                  </div>
                  <p className="text-gray-600 mt-1">Add this to &quot;Authorized JavaScript origins&quot;</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">5</span>
                <div>
                  <p className="font-medium">Save and wait</p>
                  <p className="text-gray-600">Changes may take a few minutes to propagate</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">💡 Alternative Solution</h4>
            <p className="text-blue-700">
              You can continue using email/phone authentication while Google Sign-In is being configured.
            </p>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Got it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleConfigGuide;