import * as yup from 'yup';
import { normalizeSsn } from './normalize';
import { isValidSsn, type ValidateSsnOptions } from './validate';

/**
 * Yup schema for "typing":
 * - transforms the input to a normalized prefix (UI-friendly)
 * - validates "valid so far" (allowPartial=true)
 */
export function yupSsnTyping(
  opts: Omit<ValidateSsnOptions, 'allowPartial'> = {}
) {
  return yup
    .string()
    .transform((value) => {
      const v = (value ?? '').toString();

      // Normalize for UI: prefix formatting as the user types.
      // Keep dashed output (digitsOnly=false) by default.
      return normalizeSsn(v, {
        allowPartial: true,
        digitsOnly: false,
        enforceLength: false,
      });
    })
    .test('ssn-typing-valid', 'Invalid SSN', function (value) {
      const v = (value ?? '').toString();

      const ok = isValidSsn(v, {
        ...opts,
        allowPartial: true,
      });

      return ok ? true : this.createError({ message: 'Invalid SSN' });
    });
}

/**
 * Yup schema for full submit:
 * - transforms into a canonical SSN representation
 * - validates strictly (allowPartial=false)
 */
export function yupSsnSubmit(
  opts: Omit<ValidateSsnOptions, 'allowPartial'> = {}
) {
  return yup
    .string()
    .transform((value) => {
      const v = (value ?? '').toString();

      // For submit, normalize to canonical form.
      // If requireDashes is true (default), return dashed.
      // If requireDashes is false, you might prefer digitsOnly, but we keep dashed for consistency.
      const digitsOnly = (opts.requireDashes ?? true) ? false : true;

      return normalizeSsn(v, {
        allowPartial: false,
        digitsOnly,
        enforceLength: true, // for submit, capping to 9 is usually desired
      });
    })
    .test('ssn-submit-valid', 'Invalid SSN', function (value) {
      const v = (value ?? '').toString();

      const ok = isValidSsn(v, {
        ...opts,
        allowPartial: false,
      });

      return ok ? true : this.createError({ message: 'Invalid SSN' });
    });
}
