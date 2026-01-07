import { normalizeSsnInput } from './normalize';
import { formatSsnFromDigits } from './utils';

export interface MaskSsnOptions {
  /** Allow masking partial SSNs (typing-as-you-go). */
  allowPartial?: boolean;

  /** If true, reveal last 4 digits when present (>= 4 digits typed). */
  revealLast4?: boolean;

  /** Mask character (default: "*"). Only first char is used. */
  maskChar?: string;

  /** Accept digit-only input (default: true). */
  allowNoDashes?: boolean;

  /**
   * Controls dash output:
   * - "preserve": keep dashes only if the input already contains '-'
   * - "normalize": always insert dashes in ###-##-#### style (even for digits-only)
   *
   * Default: "normalize"
   */
  dashMode?: 'preserve' | 'normalize';

  /**
   * If true (default), and allowPartial=true, invalid partial input will be masked
   * in a best-effort way (digits masked, dashes preserved).
   * If false, invalid input is returned unchanged.
   */
  bestEffortOnInvalidPartial?: boolean;
}

export function maskSsn(input: string, opts: MaskSsnOptions = {}): string {
  const allowPartial = opts.allowPartial ?? false;
  const revealLast4 = opts.revealLast4 ?? false;
  const maskChar = (opts.maskChar ?? '*').slice(0, 1) || '*';
  const allowNoDashes = opts.allowNoDashes ?? true;
  const dashMode = opts.dashMode ?? 'normalize';

  const hadDashes = input.includes('-');

  const normalized = normalizeSsnInput(input, { allowPartial, allowNoDashes });

  if (!normalized.ok) {
    // Masking is UI-safety, not validation: never return raw digits.
    // Best-effort: mask digits, keep '-' unmasked, keep any other characters as-is.
    const masked = maskBestEffort(input, { maskChar });

    // If caller wants normalized dashes, we can try to normalize by extracting digits
    // from the best-effort masked string is not possible (digits are already masked),
    // so we simply return the best-effort output.
    return masked;
  }
  const digits = normalized.digits; // 0..9 digits (partial) or 9 digits (full)

  // Determine how many digits to reveal (last 4) if present.
  const total = digits.length;

  // digits.length = total typed digits (0..9)
  const serialTyped = Math.max(0, total - 5); // digits 6..9 => 1..4
  const revealCount = revealLast4 ? Math.min(4, serialTyped) : 0;

  const maskedCount = Math.max(0, total - revealCount);
  const maskedDigits = maskChar.repeat(maskedCount) + digits.slice(maskedCount);

  // Output formatting
  if (dashMode === 'normalize') {
    // Insert dashes as ###-##-#### prefix (even while typing).
    return formatSsnFromDigits(maskedDigits);
  }

  // dashMode === "preserve"
  if (hadDashes) {
    // Input had dashes -> keep dashed presentation (normalized positions).
    return formatSsnFromDigits(maskedDigits);
  }

  // Input had no dashes -> keep digits-only.
  return maskedDigits;
}

function maskBestEffort(input: string, opts: { maskChar: string }): string {
  const m = opts.maskChar;
  let out = '';
  for (const ch of input) {
    if (ch >= '0' && ch <= '9') out += m;
    else out += ch; // dashes and any other characters preserved
  }
  return out;
}
