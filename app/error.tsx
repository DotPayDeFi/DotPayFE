"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    // Keep this boundary dependency-light so it always renders, even if
    // other UI modules fail to load during hot reload/build churn.
    console.error("App route error boundary:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-app-bg bg-cover bg-center bg-no-repeat px-4 text-white flex items-center justify-center">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-6 text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-white/70">
          Please try again. If the problem continues, go back home and retry your action.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full rounded-xl bg-[#0795B0] px-4 py-2.5 font-semibold text-white hover:bg-[#0795B0]/90"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.assign("/home")}
            className="w-full rounded-xl border border-white/20 px-4 py-2.5 font-semibold text-white hover:bg-white/10"
          >
            Go to Home
          </button>
        </div>

        {process.env.NODE_ENV !== "production" && (
          <p className="mt-4 break-words rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-white/70">
            {error.message}
          </p>
        )}
      </section>
    </main>
  );
}
