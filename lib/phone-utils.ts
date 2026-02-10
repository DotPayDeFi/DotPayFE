/**
 * Phone number utility functions for E.164 formatting
 */

/**
 * Formats a phone number to E.164 format
 * @param phoneNumber - The phone number to format (can be string or number)
 * @param defaultCountryCode - Default country code to use if not provided (defaults to '254' for Kenya)
 * @returns Formatted phone number in E.164 format (e.g., +254712345678)
 */
export function formatPhoneNumberToE164(
  phoneNumber: string | number, 
  defaultCountryCode: string = '254'
): string {
  // Convert to string and remove any non-digit characters
  const cleanedNumber = phoneNumber.toString().replace(/\D/g, '');
  
  // Handle different phone number formats
  if (cleanedNumber.startsWith('254')) {
    // Already has Kenya country code, just add +
    return '+' + cleanedNumber;
  } else if (cleanedNumber.startsWith('0')) {
    // Remove leading 0 and add +254
    return '+254' + cleanedNumber.substring(1);
  } else if (cleanedNumber.startsWith('1') || cleanedNumber.startsWith('7')) {
    // Add +254 prefix for Kenyan numbers
    return '+254' + cleanedNumber;
  } else {
    // Default: add +254 prefix
    return '+' + defaultCountryCode + cleanedNumber;
  }
}

/**
 * Validates if a phone number is in valid E.164 format
 * @param phoneNumber - The phone number to validate
 * @returns true if valid E.164 format, false otherwise
 */
export function validateE164PhoneNumber(phoneNumber: string): boolean {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
}

/**
 * Extracts country code from E.164 phone number
 * @param phoneNumber - E.164 formatted phone number
 * @returns Country code (e.g., '254' for Kenya)
 */
export function extractCountryCode(phoneNumber: string): string {
  if (!phoneNumber.startsWith('+')) {
    throw new Error('Phone number must be in E.164 format');
  }
  
  // Remove the + and extract the country code
  const withoutPlus = phoneNumber.substring(1);
  
  // Common country code lengths: 1, 2, or 3 digits
  if (withoutPlus.startsWith('1')) {
    return '1'; // US/Canada
  } else if (withoutPlus.startsWith('44')) {
    return '44'; // UK
  } else if (withoutPlus.startsWith('254')) {
    return '254'; // Kenya
  } else if (withoutPlus.startsWith('256')) {
    return '256'; // Uganda
  } else if (withoutPlus.startsWith('255')) {
    return '255'; // Tanzania
  } else if (withoutPlus.startsWith('250')) {
    return '250'; // Rwanda
  }
  
  // Default: assume 3-digit country code
  return withoutPlus.substring(0, 3);
}

/**
 * Formats phone number for display (adds spaces for readability)
 * @param phoneNumber - E.164 formatted phone number
 * @returns Formatted phone number for display
 */
export function formatPhoneNumberForDisplay(phoneNumber: string): string {
  if (!phoneNumber.startsWith('+')) {
    return phoneNumber;
  }
  
  const countryCode = extractCountryCode(phoneNumber);
  const nationalNumber = phoneNumber.substring(1 + countryCode.length);
  
  // Format based on country code
  if (countryCode === '254') {
    // Kenya: +254 XXX XXX XXX
    return `+${countryCode} ${nationalNumber.substring(0, 3)} ${nationalNumber.substring(3, 6)} ${nationalNumber.substring(6)}`;
  } else if (countryCode === '1') {
    // US/Canada: +1 (XXX) XXX-XXXX
    return `+${countryCode} (${nationalNumber.substring(0, 3)}) ${nationalNumber.substring(3, 6)}-${nationalNumber.substring(6)}`;
  } else if (countryCode === '44') {
    // UK: +44 XXXX XXX XXX
    return `+${countryCode} ${nationalNumber.substring(0, 4)} ${nationalNumber.substring(4, 7)} ${nationalNumber.substring(7)}`;
  }
  
  // Default formatting
  return phoneNumber;
}

/**
 * Common country codes for East Africa
 */
export const EAST_AFRICA_COUNTRY_CODES = {
  'KE': '+254', // Kenya
  'UG': '+256', // Uganda
  'TZ': '+255', // Tanzania
  'RW': '+250', // Rwanda
  'BI': '+257', // Burundi
  'SS': '+211', // South Sudan
} as const;

/**
 * Gets country code by country name
 * @param country - Country name or code
 * @returns Country code with + prefix
 */
export function getCountryCode(country: keyof typeof EAST_AFRICA_COUNTRY_CODES): string {
  return EAST_AFRICA_COUNTRY_CODES[country] || '+254';
}
