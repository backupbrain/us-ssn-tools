export type SsnRuleMode = 'pre2011' | 'post2011';

export interface ValidateSsnOptions {
  /**
   * If true, input must be in ###-##-#### (or a valid prefix of it when allowPartial=true).
   * If false, accepts either ###-##-#### or ######### (and prefixes).
   *
   * Default: true
   */
  requireDashes?: boolean;

  /**
   * Pre-2011 is stricter on area numbers (734-749 and >= 773 are invalid).
   * Post-2011 uses only the base area rules (000, 666, 900-999 invalid).
   *
   * Default: "post2011"
   */
  ruleMode?: SsnRuleMode;

  /**
   * If true, accept prefixes that are still potentially valid as the user types.
   * If false, require a complete SSN.
   *
   * Default: false
   */
  allowPartial?: boolean;
}

const PUBLICLY_ADVERTISED = new Set([
  '078-05-1120',
  '721-07-4426',
  '219-09-9999',
]);

export function isValidSsn(
  input: string,
  opts: ValidateSsnOptions = {}
): boolean {
  const requireDashes = opts.requireDashes ?? true;
  const ruleMode = opts.ruleMode ?? 'post2011';
  const allowPartial = opts.allowPartial ?? false;

  // 1) Format/prefix checks + digit extraction
  const parsed = parseSsnInput(input, { requireDashes, allowPartial });
  if (!parsed.ok) return false;

  const digits = parsed.digits;

  // In strict (non-partial) mode, require exactly 9 digits.
  if (!allowPartial && digits.length !== 9) return false;

  // 2) Rule checks (apply progressively in partial mode)
  // Area (first 3)
  if (digits.length >= 3) {
    const area = Number(digits.slice(0, 3));
    if (!isValidArea(area, ruleMode)) return false;
  }

  // Group (next 2)
  if (digits.length >= 5) {
    const group = Number(digits.slice(3, 5));
    if (group === 0) return false; // "00"
  }

  // Serial (last 4)
  if (digits.length === 9) {
    const serial = Number(digits.slice(5, 9));
    if (serial === 0) return false; // "0000"

    // Publicly advertised SSNs are always invalid
    const dashed = `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
    if (PUBLICLY_ADVERTISED.has(dashed)) return false;
  }

  // If partial, any prefix that passed the progressive checks is considered valid so far.
  return true;
}

/* ---------------- helpers ---------------- */

function isValidArea(area: number, ruleMode: SsnRuleMode): boolean {
  // Base rules (always)
  if (area === 0) return false; // 000
  if (area === 666) return false;
  if (area >= 900) return false;

  // Pre-2011 additional rules
  if (ruleMode === 'pre2011') {
    if (area >= 734 && area <= 749) return false;
    if (area >= 773) return false;
  }

  return true;
}

function parseSsnInput(
  input: string,
  opts: { requireDashes: boolean; allowPartial: boolean }
): { ok: true; digits: string } | { ok: false } {
  const { requireDashes, allowPartial } = opts;

  if (!allowPartial) {
    // Full input only
    if (/^\d{3}-\d{2}-\d{4}$/.test(input)) {
      return { ok: true, digits: input.replace(/-/g, '') };
    }
    if (!requireDashes && /^\d{9}$/.test(input)) {
      return { ok: true, digits: input };
    }
    return { ok: false };
  }

  // Partial / typing-as-you-go
  if (requireDashes) {
    // Must be a prefix of ###-##-####
    // Allowed prefixes include:
    // "", "1", "12", "123", "123-", "123-4", "123-45", "123-45-", "123-45-6", ...
    if (!/^[0-9-]*$/.test(input)) return { ok: false };

    // Enforce dash positions and ordering as user types.
    // Build digits while ensuring '-' only appears right after 3 and 5 digits (and at most once each).
    let digits = '';
    let sawDashAt3 = false;
    let sawDashAt5 = false;

    for (const ch of input) {
      if (ch >= '0' && ch <= '9') {
        if (digits.length >= 9) return { ok: false };
        digits += ch;
        continue;
      }

      // ch === '-'
      if (digits.length === 3 && !sawDashAt3) {
        sawDashAt3 = true;
      } else if (digits.length === 5 && !sawDashAt5) {
        sawDashAt5 = true;
      } else {
        return { ok: false };
      }
    }

    // Also disallow typing digits past 3 without having placed the first dash (since requireDashes=true).
    // The loop above already enforces this implicitly: "1234" contains no dash; it's allowed as digits,
    // but would be a prefix of digits-only, not of dashed format. If you want "1234" to be invalid
    // when requireDashes=true, enforce it here:
    if (digits.length > 3 && !sawDashAt3) return { ok: false };
    if (digits.length > 5 && !sawDashAt5) return { ok: false };

    return { ok: true, digits };
  }

  // requireDashes === false in partial mode:
  // accept either digits-only prefixes or dashed prefixes (as long as dashes are in valid positions)
  if (!/^[0-9-]*$/.test(input)) return { ok: false };

  let digits = '';
  let sawDashAt3 = false;
  let sawDashAt5 = false;

  for (const ch of input) {
    if (ch >= '0' && ch <= '9') {
      if (digits.length >= 9) return { ok: false };
      digits += ch;
      continue;
    }

    // '-' present: enforce positions (same as dashed typing), but do not require them.
    if (digits.length === 3 && !sawDashAt3) {
      sawDashAt3 = true;
    } else if (digits.length === 5 && !sawDashAt5) {
      sawDashAt5 = true;
    } else {
      return { ok: false };
    }
  }

  return { ok: true, digits };
}
