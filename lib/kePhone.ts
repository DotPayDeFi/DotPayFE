function digitsOnly(input: string) {
  return String(input || "").replace(/[^0-9]/g, "");
}

/**
 * Normalizes Kenyan phone numbers to the M-Pesa/Daraja expected format: 2547XXXXXXXX / 2541XXXXXXXX.
 * Accepts common user inputs like:
 * - 0712345678
 * - 712345678
 * - +254712345678
 * - 254712345678
 */
export function toMpesaPhone(input: string): string | null {
  const digits = digitsOnly(input);
  if (!digits) return null;

  // Already in 254XXXXXXXXX format.
  if (digits.startsWith("254") && digits.length === 12) {
    const prefix = digits.slice(0, 4); // 2547 or 2541
    if (prefix === "2547" || prefix === "2541") return digits;
    // Keep generic 254... if length matches; let backend validate further.
    return digits;
  }

  // Local 07XXXXXXXX / 01XXXXXXXX
  if ((digits.startsWith("07") || digits.startsWith("01")) && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }

  // Missing leading 0: 7XXXXXXXX / 1XXXXXXXX
  if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9) {
    return `254${digits}`;
  }

  return null;
}

export function toE164KePhone(input: string): string | null {
  const mpesa = toMpesaPhone(input);
  if (!mpesa) return null;
  return `+${mpesa}`;
}

