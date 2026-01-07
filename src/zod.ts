import { z } from 'zod';
import { isValidSsn, type ValidateSsnOptions } from './validate';
import { normalizeSsn } from './normalize';

/**
 * Zod schema for "typing":
 * - normalizes on every parse (prefix formatting)
 * - validates "valid so far" (allowPartial=true)
 *
 * Output is a normalized prefix in ###-##-#### style by default.
 */
export function zodSsnTyping(
  opts: Omit<ValidateSsnOptions, 'allowPartial'> = {}
) {
  return z.string().transform((val, ctx) => {
    const input = (val ?? '').toString();

    const normalized = normalizeSsn(input, {
      allowPartial: true,
      digitsOnly: false,
      enforceLength: false,
    });

    const ok = isValidSsn(normalized, {
      ...opts,
      allowPartial: true,
    });

    if (!ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid SSN',
      });
      return z.NEVER;
    }

    return normalized;
  });
}

/**
 * Zod schema for "submit":
 * - normalizes to canonical (dashed by default)
 * - validates strictly (allowPartial=false)
 *
 * Output is fully normalized (either dashed or digits-only depending on requireDashes).
 */
export function zodSsnSubmit(
  opts: Omit<ValidateSsnOptions, 'allowPartial'> = {}
) {
  return z.string().transform((val, ctx) => {
    const input = (val ?? '').toString();

    const requireDashes = opts.requireDashes ?? true;
    const digitsOnly = requireDashes ? false : true;

    const normalized = normalizeSsn(input, {
      allowPartial: false,
      digitsOnly,
      enforceLength: true,
    });

    const ok = isValidSsn(normalized, {
      ...opts,
      allowPartial: false,
    });

    if (!ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid SSN',
      });
      return z.NEVER;
    }

    return normalized;
  });
}
