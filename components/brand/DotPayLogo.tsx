"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type DotPayLogoProps = {
  className?: string;
  /**
   * Logo height in px. (Width is intrinsic to the wordmark.)
   */
  size?: number;
};

export default function DotPayLogo({ className, size = 56 }: DotPayLogoProps) {
  // Prevent SVG id collisions when multiple logos are rendered on a page.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ringGradientId = `dotpay-ring-${uid}`;

  return (
    <div
      role="img"
      aria-label="DotPay"
      className={cn("inline-flex items-center select-none leading-none", className)}
      style={{ fontSize: size }}
    >
      <span className="font-poppins font-semibold leading-none text-[#0995B0]">
        d
      </span>

      {/* "o" mark: ring of nodes (approx. of the provided DotPay logo) */}
      <svg
        aria-hidden="true"
        width="0.92em"
        height="0.92em"
        viewBox="0 0 100 100"
        className="mx-[-0.16em] translate-y-[0.04em]"
      >
        <defs>
          <linearGradient
            id={ringGradientId}
            x1="18"
            y1="18"
            x2="82"
            y2="82"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#46C8C5" />
            <stop offset="0.55" stopColor="#3F86E0" />
            <stop offset="1" stopColor="#7B5CFF" />
          </linearGradient>
        </defs>

        <circle
          cx="50"
          cy="50"
          r="28"
          fill="none"
          stroke={`url(#${ringGradientId})`}
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.95"
        />

        {[
          [50, 16],
          [69, 21],
          [80, 38],
          [78, 58],
          [64, 74],
          [44, 80],
          [26, 70],
          [18, 51],
          [23, 32],
          [36, 20],
        ].map(([cx, cy], idx) => (
          <circle
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            cx={cx}
            cy={cy}
            r="5"
            fill={`url(#${ringGradientId})`}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1"
          />
        ))}
      </svg>

      <span className="font-poppins font-semibold leading-none text-[#0995B0]">
        tpay
      </span>
    </div>
  );
}

