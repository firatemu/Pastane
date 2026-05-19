/**
 * Normalizes common Turkish mobile inputs to digits-only storage form (90 + 10-digit national number).
 * Accepts e.g. 905551234567, 05551234567, 5551234567, and strips separators / leading +.
 */
export function normalizeTrMobilePhoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0') && digits[1] === '5') {
    return `90${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith('5')) {
    return `90${digits}`;
  }
  return digits;
}
