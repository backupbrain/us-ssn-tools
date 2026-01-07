import { NormalizeSsnErr, normalizeSsnInput } from './normalize';

export type SsnValidationFailureReason =
  | 'INVALID_FORMAT'
  | 'INVALID_AREA'
  | 'INVALID_GROUP'
  | 'INVALID_SERIAL'
  | 'PUBLICLY_ADVERTISED';

export type SsnRuleMode = 'pre2011' | 'post2011' | 'both';

export type SsnValidationOkResult = {
  ok: true;
  normalized: string;
};

export type SsnValidationErrorResult = {
  ok: false;
  error: SsnValidationFailureReason;
  message: string;
};

export type SsnValidationResult =
  | SsnValidationOkResult
  | SsnValidationErrorResult;

export interface ValidateSsnOptions {
  /**
   * If true, accept either "#########" or "###-##-####" as input.
   * If false, require exact "###-##-####" (or partial prefix of it if allowPartial=true).
   */
  allowNoDashes?: boolean;

  /**
   * Which rule-set(s) to accept.
   * - "pre2011": apply stricter pre–Jun 25 2011 area rules (734–749, >=773 invalid)
   * - "post2011": do NOT apply those extra area restrictions
   * - "both": accept either (default)
   *
   * Note: base rules (area 000/666/900-999, group 00, serial 0000, public list) still apply.
   */
  ruleMode?: SsnRuleMode;

  /**
   * If true, allow "checking-as-you-go":
   * - partial prefixes are accepted as long as they could still become valid
   * - returned normalized string is the sanitized, dash-normalized prefix
   */
  allowPartial?: boolean;
}

const PUBLICLY_ADVERTISED = new Set([
  '078-05-1120',
  '721-07-4426',
  '219-09-9999',
]);

/**
 * Validates a US SSN with support for:
 * - strict full validation
 * - optional acceptance of no-dash input
 * - rule modes: pre2011 | post2011 | both (default)
 * - optional "checking-as-you-go" partial validation
 */ export function validateSsn(
  input: string,
  opts: ValidateSsnOptions = {}
): SsnValidationResult {
  const allowNoDashes = opts.allowNoDashes ?? true;
  const ruleMode = opts.ruleMode ?? 'both';
  const allowPartial = opts.allowPartial ?? false;

  const normalized = normalizeSsnInput(input, {
    allowNoDashes,
    allowPartial,
  });

  if (!normalized.ok) {
    return {
      ok: false,
      error: 'INVALID_FORMAT',
      message: (normalized as NormalizeSsnErr).message,
    };
  }

  const digits = normalized.digits;
  const area = digits.slice(0, 3);
  const group = digits.slice(3, 5);
  const serial = digits.slice(5, 9);

  if (!allowPartial && PUBLICLY_ADVERTISED.has(normalized.normalized)) {
    return {
      ok: false,
      error: 'PUBLICLY_ADVERTISED',
      message: 'This SSN is a known publicly advertised (and invalid) value.',
    };
  }

  const ruleCheck = allowPartial
    ? validatePartialSegments(area, group, serial, ruleMode)
    : validateFullSegments(area, group, serial, ruleMode);

  if (!ruleCheck.ok) return ruleCheck;

  return { ok: true, normalized: normalized.normalized };
}

/** Convenience boolean wrapper */
export function isValidSsn(input: string, opts?: ValidateSsnOptions): boolean {
  return validateSsn(input, opts).ok;
}

function normalizePrefix(digits: string): string {
  // digits: 0..9 chars
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

/* -------------------------- Rules -------------------------- */

function validateFullSegments(
  area: string,
  group: string,
  serial: string,
  ruleMode: SsnRuleMode
): SsnValidationResult {
  const areaNum = Number(area);
  const groupNum = Number(group);
  const serialNum = Number(serial);

  // Base Rule 2: area cannot be 000, 666, or 900–999
  if (areaNum === 0 || areaNum === 666 || areaNum >= 900) {
    return {
      ok: false,
      error: 'INVALID_AREA',
      message:
        'Area number is not allowed (000, 666, and 900–999 are invalid).',
    };
  }

  // Ruleset selection:
  // - pre2011: apply extra reserved ranges
  // - post2011: do not
  // - both: accept if EITHER passes (so we only fail if it violates post rules AND pre rules)
  const violatesPre2011 = (areaNum >= 734 && areaNum <= 749) || areaNum >= 773;

  if (ruleMode === 'pre2011' && violatesPre2011) {
    return {
      ok: false,
      error: 'INVALID_AREA',
      message:
        'Area number is not allowed under pre–June 25, 2011 rules (734–749 and >= 773 are invalid).',
    };
  }
  if (ruleMode === 'both') {
    // If it violates pre2011, it's still acceptable as post2011.
    // So no action needed.
  }

  // Rule 3: group cannot be 00
  if (groupNum === 0) {
    return {
      ok: false,
      error: 'INVALID_GROUP',
      message: 'Group number may not be 00.',
    };
  }

  // Rule 4: serial cannot be 0000
  if (serialNum === 0) {
    return {
      ok: false,
      error: 'INVALID_SERIAL',
      message: 'Serial number may not be 0000.',
    };
  }

  // Rule 7: publicly advertised checked in validateSsn (full only)
  return { ok: true, normalized: `${area}-${group}-${serial}` };
}

function validatePartialSegments(
  area: string,
  group: string,
  serial: string,
  ruleMode: SsnRuleMode
): SsnValidationResult {
  // AREA checks while typing:
  // - if first digit is '9', area can never be valid (since 900–999 invalid)
  if (area.length >= 1 && area[0] === '9') {
    return {
      ok: false,
      error: 'INVALID_AREA',
      message: 'Area numbers starting with 9 are not allowed.',
    };
  }

  // - if area is complete (3 digits), enforce base rule 2 and (optionally) pre2011 when in pre-only mode
  if (area.length === 3) {
    const areaNum = Number(area);

    if (areaNum === 0 || areaNum === 666 || areaNum >= 900) {
      return {
        ok: false,
        error: 'INVALID_AREA',
        message:
          'Area number is not allowed (000, 666, and 900–999 are invalid).',
      };
    }

    const violatesPre2011 =
      (areaNum >= 734 && areaNum <= 749) || areaNum >= 773;
    if (ruleMode === 'pre2011' && violatesPre2011) {
      return {
        ok: false,
        error: 'INVALID_AREA',
        message:
          'Area number is not allowed under pre–June 25, 2011 rules (734–749 and >= 773 are invalid).',
      };
    }
    // ruleMode "both" accepts either; "post2011" ignores extra restrictions.
  }

  // GROUP checks while typing:
  // Only enforce once group is complete (2 digits)
  if (group.length === 2) {
    const groupNum = Number(group);
    if (groupNum === 0) {
      return {
        ok: false,
        error: 'INVALID_GROUP',
        message: 'Group number may not be 00.',
      };
    }
  }

  // SERIAL checks while typing:
  // Only enforce once serial is complete (4 digits)
  if (serial.length === 4) {
    const serialNum = Number(serial);
    if (serialNum === 0) {
      return {
        ok: false,
        error: 'INVALID_SERIAL',
        message: 'Serial number may not be 0000.',
      };
    }

    // Now that we have a full SSN in partial mode, also block publicly advertised.
    const fullNormalized = `${area}-${group}-${serial}`;
    if (PUBLICLY_ADVERTISED.has(fullNormalized)) {
      return {
        ok: false,
        error: 'PUBLICLY_ADVERTISED',
        message: 'This SSN is a known publicly advertised (and invalid) value.',
      };
    }
  }

  // If we haven't hit a definitive violation yet, it's valid "so far".
  return {
    ok: true,
    normalized: normalizePrefix((area + group + serial).slice(0, 9)),
  };
}
