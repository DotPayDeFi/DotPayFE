import { Head, Html, Main, NextScript } from "next/document";

// This project primarily uses the App Router (`app/`), but Next.js still expects
// a `_document` entry during `next build` when certain plugins (e.g. PWA) are enabled.
// Keeping this minimal prevents build-time "Cannot find module for page: /_document".
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

