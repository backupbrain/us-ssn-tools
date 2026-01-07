/**
 * Format SSN from digits. Used for UI
 */
export function formatSsnFromDigits(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

/**
 * Formats digits as ###-##-#### and if there are extra digits, appends them after the serial.
 * Example: "12345678999" -> "123-45-678999"
 */
export function formatSsnWithOverflow(digits: string): string {
  if (digits.length <= 9) return formatSsnFromDigits(digits);
  return `${formatSsnFromDigits(digits.slice(0, 9))}${digits.slice(9)}`;
}
