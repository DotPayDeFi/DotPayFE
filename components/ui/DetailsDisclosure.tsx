"use client";

import { cn } from "@/lib/utils";

export function DetailsDisclosure({
  label = "Details",
  children,
  className,
  defaultOpen = false,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className={cn(
        "group rounded-xl border border-white/10 bg-white/5 p-4",
        className
      )}
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none select-none text-sm font-semibold text-white/90">
        <span className="inline-flex items-center gap-2">
          {label}
          <span className="text-xs font-semibold text-white/45 group-open:hidden">Show</span>
          <span className="text-xs font-semibold text-white/45 hidden group-open:inline">
            Hide
          </span>
        </span>
      </summary>
      <div className="mt-3 text-sm text-white/75">{children}</div>
    </details>
  );
}

