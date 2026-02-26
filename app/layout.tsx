import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "@/styles/style.css";
import { BalanceProvider } from "@/context/BalanceContext";
import { ChainProvider } from "@/context/ChainContext";
import { WalletProvider } from "@/context/WalletContext";
import { PWAProvider } from "@/context/PWAContext";
import { BusinessProvider } from "@/context/BusinessContext";
import ClientOnly from "./ClientOnly";
import { ReactQueryClientProvider } from "@/providers/ReactQueryClientProvider";
import { Toaster } from "react-hot-toast";
import { ThirdwebProvider } from "thirdweb/react";
import { AuthSessionProvider } from "@/context/AuthSessionContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThirdwebAutoConnect } from "@/components/auth/ThirdwebAutoConnect";
import { AppShell } from "@/components/layout/AppShell";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  applicationName: "DotPay",
  title: {
    default: "DotPay - Mobile Wallet",
    template: "DotPay - %s",
  },
  metadataBase: new URL("https://app.dotpay.xyz"),
  description:
    "Send, pay, and cash out with a USD balance shown in KSh. Fast transfers, clear receipts, and M-Pesa-ready payments.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DotPay",
    startupImage: [
      {
        url: "/icons/icon-512x512.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "DotPay",
    title: {
      default: "DotPay - Mobile Wallet",
      template: "DotPay - %s",
    },
    description: "Send, pay, and cash out with a USD balance shown in KSh.",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "DotPay Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: {
      default: "DotPay - Mobile Wallet",
      template: "DotPay - %s",
    },
    description: "Send, pay, and cash out with a USD balance shown in KSh.",
    images: ["/icons/icon-512x512.png"],
  },
  keywords: ["payments", "wallet", "mpesa", "kenya", "ksh", "send money", "pay bills"],
  authors: [{ name: "DotPay Team" }],
  creator: "DotPay",
  publisher: "DotPay",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};



export const viewport: Viewport = {
  themeColor: "#0795B0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === "development" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function(){
                  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(regs){
                      regs.forEach(function(reg){ reg.unregister(); });
                    }).catch(function(){});
                  }
                  if (typeof caches !== 'undefined') {
                    caches.keys().then(function(keys){
                      keys.forEach(function(k){ caches.delete(k); });
                    }).catch(function(){});
                  }
                })();
              `,
            }}
          />
        )}
        <meta name="application-name" content="DotPay" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="DotPay" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#0795B0" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#0795B0" />
        
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-192x192.png" />
        
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/icons/icon-192x192.png" color="#0795B0" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://app.dotpay.xyz" />
        <meta name="twitter:title" content="DotPay - Mobile Wallet" />
        <meta name="twitter:description" content="Send, pay, and cash out with a USD balance shown in KSh." />
        <meta name="twitter:image" content="https://app.dotpay.xyz/icons/icon-192x192.png" />
        <meta name="twitter:creator" content="@dotpay" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="DotPay - Mobile Wallet" />
        <meta property="og:description" content="Send, pay, and cash out with a USD balance shown in KSh." />
        <meta property="og:site_name" content="DotPay" />
        <meta property="og:url" content="https://app.dotpay.xyz" />
        <meta property="og:image" content="https://app.dotpay.xyz/icons/icon-512x512.png" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="lazyOnload"
        />
        {/* Suppress console logs in production */}
        {process.env.NODE_ENV === 'production' && (
          <script dangerouslySetInnerHTML={{ __html: `
            (function(){
              var safe = function(){};
              var methods = ['log','debug','info','warn','error'];
              methods.forEach(function(m){try{console[m]=safe;}catch(e){}});
              // Disable React devtools hook exposure if present
              try{ if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                for (const k in window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                  window.__REACT_DEVTOOLS_GLOBAL_HOOK__[k] = typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__[k] === 'function' ? function(){} : null;
                }
              }}catch(e){}
            })();
          ` }} />
        )}
        <ReactQueryClientProvider>
          <ThirdwebProvider>
            <ThirdwebAutoConnect />
            <AuthSessionProvider>
              <AuthProvider>
                <PWAProvider>
                  <BusinessProvider>
                    <WalletProvider>
                      <ChainProvider>
                        <BalanceProvider>
                          <ClientOnly>
                            <AppShell>{children}</AppShell>
                          </ClientOnly>
                          <Toaster />
                        </BalanceProvider>
                      </ChainProvider>
                    </WalletProvider>
                  </BusinessProvider>
                </PWAProvider>
              </AuthProvider>
            </AuthSessionProvider>
          </ThirdwebProvider>
        </ReactQueryClientProvider>
      </body>
    </html>
  );
}
