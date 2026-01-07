import { z } from 'zod';
import {
  SsnValidationErrorResult,
  validateSsn,
  type ValidateSsnOptions,
} from './validate';

/**
 * Zod schema for "typing": normalizes on every parse and allows partial input.
 * Output is a normalized prefix in ###-##-#### style (e.g. "1234" -> "123-4").
 */
export function zodSsnTyping(
  opts: Omit<ValidateSsnOptions, 'allowPartial'> = {}
) {
  return z.string().transform((val, ctx) => {
    const res = validateSsn(val, { ...opts, allowPartial: true });
    if (!res.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: (res as SsnValidationErrorResult).message,
        params: { ssnError: (res as SsnValidationErrorResult).error },
      });
      return z.NEVER;
    }
    return res.normalized; // normalized prefix
  });
}

/**
 * Zod schema for "submit": requires a full SSN and returns fully normalized ###-##-####.
 */
export function zodSsnSubmit(
  opts: Omit<ValidateSsnOptions, 'allowPartial'> = {}
) {
  return z.string().transform((val, ctx) => {
    const res = validateSsn(val, { ...opts, allowPartial: false });
    if (!res.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: (res as SsnValidationErrorResult).message,
        params: { ssnError: (res as SsnValidationErrorResult).error },
      });
      return z.NEVER;
    }
    return res.normalized; // full normalized ###-##-####
  });
}
