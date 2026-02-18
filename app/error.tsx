/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import toast from "react-hot-toast";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    toast.error(error.message);
  }, []);

  return (
    <main className="min-h-screen bg-app-bg bg-cover bg-center bg-no-repeat px-4 text-white flex items-center justify-center">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-6 text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-white/70">
          Please try again. If the problem continues, go back home and retry your action.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3">
          <Button
            onClick={() => reset()}
            className="w-full bg-[#0795B0] hover:bg-[#0795B0]/90 text-white"
          >
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.assign("/home")}
            className="w-full border-white/20 text-white hover:bg-white/10"
          >
            Go to Home
          </Button>
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
