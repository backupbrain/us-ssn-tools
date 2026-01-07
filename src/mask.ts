import { normalizeSsn } from './normalize';
import { formatSsnWithOverflow } from './utils';

export interface MaskSsnOptions {
  /**
   * Allow masking partial SSNs (typing-as-you-go).
   * Default: true
   */
  allowPartial?: boolean;

  /**
   * Reveal serial digits as they are typed:
   * - before serial (<=5 digits): reveal nothing
   * - serial (6..9 digits): reveal up to 4 digits
   *
   * Default: false
   */
  revealLast4?: boolean;

  /**
   * Mask character (default: "*").
   * Only the first character is used.
   */
  maskChar?: string;

  /**
   * Output digits only (no dashes).
   * Default: false
   */
  digitsOnly?: boolean;

  /**
   * If true, cap to 9 digits (SSN length).
   * If false, allow overflow digits (UI testing / paste scenarios).
   *
   * Default: false
   */
  enforceLength?: boolean;
}

export function maskSsn(input: string, opts: MaskSsnOptions = {}): string {
  const allowPartial = opts.allowPartial ?? true;
  const revealLast4 = opts.revealLast4 ?? false;
  const digitsOnly = opts.digitsOnly ?? false;
  const enforceLength = opts.enforceLength ?? false;
  const maskChar = (opts.maskChar ?? '*').slice(0, 1) || '*';

  // 1) Normalize → DIGITS ONLY
  const digits = normalizeSsn(input, {
    allowPartial,
    digitsOnly: true,
    enforceLength,
  });

  // 2) Mask
  const total = digits.length;

  // Reveal only serial digits (positions 6–9)
  const serialTyped = Math.max(0, total - 5);
  const revealCount = revealLast4 ? Math.min(4, serialTyped) : 0;

  const maskedCount = Math.max(0, total - revealCount);
  const maskedDigits = maskChar.repeat(maskedCount) + digits.slice(maskedCount);

  // 3) Output formatting
  if (digitsOnly) return maskedDigits;

  return formatSsnWithOverflow(maskedDigits);
}
