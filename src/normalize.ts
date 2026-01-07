import { formatSsnFromDigits, formatSsnWithOverflow } from './utils';

export interface NormalizeSsnOptions {
  /**
   * If true, formats prefixes while typing.
   * - dashed mode: "1234" -> "123-4"
   * - digits-only mode: returns digits as-is
   *
   * Default: true
   */
  allowPartial?: boolean;

  /**
   * If true, return digits only (no dashes inserted).
   * If false, insert dashes in ###-##-#### style.
   *
   * Default: false
   */
  digitsOnly?: boolean;

  /**
   * If true, cap extracted digits at 9.
   * If false, allow any number of digits (useful for UI behavior testing).
   *
   * Default: true
   */
  enforceLength?: boolean;
}

/**
 * Best-effort SSN normalization for UI display.
 * - Returns a string only (no validity info).
 * - Never throws.
 * - Extracts digits from input and optionally inserts dashes.
 * - Optionally caps to 9 digits (enforceLength).
 * - Keeps behavior predictable for "typing-as-you-go".
 */
export function normalizeSsn(
  input: string,
  opts: NormalizeSsnOptions = {}
): string {
  const allowPartial = opts.allowPartial ?? true;
  const digitsOnly = opts.digitsOnly ?? false;
  const enforceLength = opts.enforceLength ?? true;

  // Extract digits, optionally cap to 9 for SSN-shaped output.
  let digits = '';
  for (const ch of input) {
    if (ch >= '0' && ch <= '9') {
      digits += ch;
      if (enforceLength && digits.length === 9) break;
    }
  }

  if (digitsOnly) {
    // digits-only output: just return the extracted digits (possibly >9 if enforceLength=false)
    return digits;
  }

  // dashed output
  if (allowPartial) {
    // Typing mode: format prefix. If digits > 9 and enforceLength=false,
    // we format the SSN-shaped prefix and append the rest after the serial.
    return formatSsnWithOverflow(digits);
  }

  // Non-partial mode: only format if we have a full 9 digits; otherwise return input unchanged.
  // (Prevents jumpy formatting in contexts where you don't want as-you-type behavior.)
  if (digits.length === 9 || (enforceLength && digits.length === 9)) {
    return formatSsnFromDigits(digits.slice(0, 9));
  }

  return input;
}
