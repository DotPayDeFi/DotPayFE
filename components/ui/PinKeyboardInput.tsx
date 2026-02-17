"use client";

import { useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";

function normalizePin(value: string, length: number) {
  return String(value || "").replace(/\\D/g, "").slice(0, length);
}

function PinDots({ value, length }: { value: string; length: number }) {
  const v = normalizePin(value, length);
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`PIN length ${v.length} of ${length}`}>
      {Array.from({ length }).map((_, idx) => {
        const filled = idx < v.length;
        return (
          <span
            key={idx}
            className={cn(
              "h-3 w-3 rounded-full border",
              filled ? "border-cyan-200/40 bg-cyan-200" : "border-white/20 bg-white/5"
            )}
          />
        );
      })}
    </div>
  );
}

export function PinKeyboardInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  label = "Enter PIN",
  helperText,
  errorText,
  onComplete,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  errorText?: string | null;
  onComplete?: (pin: string) => void;
  className?: string;
}) {
  const inputId = useMemo(
    () => `pin-input-${Math.random().toString(36).slice(2)}`,
    []
  );

  const normalized = normalizePin(value, length);

  const set = useCallback(
    (next: string) => {
      const n = normalizePin(next, length);
      onChange(n);
      if (onComplete && n.length === length) onComplete(n);
    },
    [length, onChange, onComplete]
  );

  return (
    <section className={cn("rounded-2xl border border-white/10 bg-white/5 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <label htmlFor={inputId} className="text-sm font-semibold text-white">
            {label}
          </label>
          {helperText && <p className="mt-1 text-xs text-white/65">{helperText}</p>}
          {errorText && (
            <p className="mt-2 rounded-lg border border-red-300/35 bg-red-500/10 px-3 py-2 text-xs text-red-100">
              {errorText}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => set("")}
          disabled={disabled || !normalized.length}
          className="shrink-0 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white/75 hover:bg-black/30 disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      <div className="relative mt-4 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-5 hover:bg-black/30 focus-within:border-cyan-300/30 focus-within:ring-2 focus-within:ring-cyan-300/20">
        <PinDots value={normalized} length={length} />
        <input
          id={inputId}
          value={normalized}
          onChange={(e) => set(e.target.value)}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={length}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          // Invisible input overlay: uses device keyboard, while dots show progress.
          className={cn(
            "absolute inset-0 h-full w-full rounded-2xl bg-transparent text-transparent caret-transparent outline-none",
            disabled ? "cursor-not-allowed" : "cursor-text"
          )}
          aria-label={label}
        />
      </div>

      <p className="mt-3 text-[11px] font-semibold text-white/55">Use your device keyboard</p>
    </section>
  );
}
