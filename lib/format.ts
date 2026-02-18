export function formatKsh(
  value: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "KSh —";
  return `KSh ${new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  }).format(n)}`;
}

export function formatUsd(
  value: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "USD —";
  return `USD ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(n)}`;
}

export function formatRateKshPerUsd(rate: number) {
  const n = Number(rate);
  if (!Number.isFinite(n) || n <= 0) return "Exchange rate unavailable";
  return `1 USD ≈ ${formatKsh(n, { maximumFractionDigits: 2 })}`;
}

export function shortHash(value: string, chars: number = 4) {
  const v = String(value || "");
  if (!v) return "";
  if (v.length <= 2 * chars + 3) return v;
  return `${v.slice(0, 2 + chars)}…${v.slice(-chars)}`;
}

