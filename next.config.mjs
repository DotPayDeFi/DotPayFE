// /** @type {import('next').NextConfig} */

// import withPWA from 'next-pwa';

// const nextConfig = {
//   output: "standalone",
//   async redirects() {
//     return [
//       {
//         source: "/",
//         destination: "/onboarding",
//         permanent: false
//       }
//     ];
//   },
//   ...withPWA({
//     dest: 'public',
//     register: true,
//     skipWaiting: true,
//     disable: process.env.NODE_ENV === "development"
//   })
// };

// export default nextConfig;



/** @type {import('next').NextConfig} */

import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  reloadOnOnline: true,
  // Keep Next.js default runtime caching and only extend it with API caching.
  // Custom broad JS/CSS caching can serve stale chunks after deploys.
  extendDefaultRuntimeCaching: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.dotpay\.xyz\/api\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24, // 24 hours
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
    skipWaiting: true,
    clientsClaim: true,
  },
  fallbacks: {
    document: '/offline',
  },
});

const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@phosphor-icons/react'],
  },
  webpack: (config) => {
    // thirdweb -> walletconnect -> pino optionally references `pino-pretty`.
    // We don't use it in the app bundle; stubbing avoids build warnings/errors.
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "pino-pretty": false,
    };
    return config;
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/onboarding",
        permanent: false,
      },
      {
        source: "/dashboard",
        destination: "/home",
        permanent: false,
      },
      // Compatibility redirects
      {
        source: "/receive",
        destination: "/add-funds",
        permanent: false,
      },
      {
        source: "/send",
        has: [{ type: "query", key: "mode", value: "pay" }],
        destination: "/pay",
        permanent: false,
      },
      {
        source: "/send",
        has: [{ type: "query", key: "mode", value: "paybill" }],
        destination: "/pay/paybill",
        permanent: false,
      },
      {
        source: "/send",
        has: [{ type: "query", key: "mode", value: "buygoods" }],
        destination: "/pay/till",
        permanent: false,
      },
    ];
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
