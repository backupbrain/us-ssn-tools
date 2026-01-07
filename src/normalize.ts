import { formatSsnFromDigits } from './utils';

export interface NormalizeSsnOptions {
  allowNoDashes?: boolean;
  allowPartial?: boolean;
}

export type NormalizeSsnOk = {
  ok: true;
  digits: string;
  normalized: string;
};

export type NormalizeSsnErr = {
  ok: false;
  message: string;
};

export type NormalizeSsnResult = NormalizeSsnOk | NormalizeSsnErr;

export function normalizeSsnInput(
  input: string,
  opts: NormalizeSsnOptions = {}
): NormalizeSsnResult {
  const allowNoDashes = opts.allowNoDashes ?? true;
  const allowPartial = opts.allowPartial ?? false;

  const raw = input;

  // Full (non-partial) normalization
  if (!allowPartial) {
    if (/^\d{3}-\d{2}-\d{4}$/.test(raw)) {
      return {
        ok: true,
        digits: raw.replace(/-/g, ''),
        normalized: raw,
      };
    }

    if (allowNoDashes && /^\d{9}$/.test(raw)) {
      return {
        ok: true,
        digits: raw,
        normalized: `${raw.slice(0, 3)}-${raw.slice(3, 5)}-${raw.slice(5)}`,
      };
    }

    return { ok: false, message: 'Invalid SSN format.' };
  }

  // ---- Partial / typing-as-you-go normalization ----

  if (!/^[0-9-]*$/.test(raw)) {
    return { ok: false, message: "Only digits and '-' are allowed." };
  }

  let digits = '';
  let sawDashAt3 = false;
  let sawDashAt5 = false;

  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') {
      digits += ch;
      if (digits.length > 9) {
        return { ok: false, message: 'SSN is too long.' };
      }
      continue;
    }

    // ch === '-'
    if (!allowNoDashes) {
      return { ok: false, message: 'Dashes are not allowed.' };
    }

    if (digits.length === 3 && !sawDashAt3) {
      sawDashAt3 = true;
    } else if (digits.length === 5 && !sawDashAt5) {
      sawDashAt5 = true;
    } else {
      return { ok: false, message: 'Dash is in an invalid position.' };
    }
  }

  return {
    ok: true,
    digits,
    normalized: formatSsnFromDigits(digits),
  };
}
