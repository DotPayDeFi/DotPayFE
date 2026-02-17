"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

function normalizePin(value: string, length: number) {
  return String(value || "").replace(/\D/g, "").slice(0, length);
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

type Key = { type: "digit"; value: string } | { type: "backspace" } | { type: "spacer" };

const KEYS: Key[] = [
  { type: "digit", value: "1" },
  { type: "digit", value: "2" },
  { type: "digit", value: "3" },
  { type: "digit", value: "4" },
  { type: "digit", value: "5" },
  { type: "digit", value: "6" },
  { type: "digit", value: "7" },
  { type: "digit", value: "8" },
  { type: "digit", value: "9" },
  { type: "spacer" },
  { type: "digit", value: "0" },
  { type: "backspace" },
];

export function PinKeypad({
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
  const normalized = normalizePin(value, length);

  function set(next: string) {
    const n = normalizePin(next, length);
    onChange(n);
    if (onComplete && n.length === length) onComplete(n);
  }

  function handleDigit(d: string) {
    if (disabled) return;
    if (normalized.length >= length) return;
    set(`${normalized}${d}`);
  }

  function handleBackspace() {
    if (disabled) return;
    if (!normalized.length) return;
    set(normalized.slice(0, -1));
  }

  return (
    <section className={cn("rounded-2xl border border-white/10 bg-white/5 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{label}</p>
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

      <div className="mt-4">
        <PinDots value={normalized} length={length} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {KEYS.map((k, idx) => {
          if (k.type === "spacer") return <div key={`sp-${idx}`} />;
          if (k.type === "backspace") {
            return (
              <button
                key={`bk-${idx}`}
                type="button"
                onClick={handleBackspace}
                disabled={disabled || !normalized.length}
                aria-label="Backspace"
                className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/85 hover:bg-black/30 disabled:opacity-50"
              >
                <Delete className="h-5 w-5" />
              </button>
            );
          }

          const digit = k.value;
          return (
            <button
              key={`${digit}-${idx}`}
              type="button"
              onClick={() => handleDigit(digit)}
              disabled={disabled || normalized.length >= length}
              className="h-14 rounded-2xl border border-white/10 bg-black/20 text-lg font-semibold text-white hover:bg-black/30 disabled:opacity-50"
            >
              {digit}
            </button>
          );
        })}
      </div>
    </section>
  );
}

