import * as yup from 'yup';
import {
  SsnValidationErrorResult,
  validateSsn,
  type ValidateSsnOptions,
} from './validate';

/**
 * Yup schema for "typing": normalizes to a prefix and allows partial validity.
 * Note: transform runs before test in Yup.
 */
export function yupSsnTyping(
  opts: Omit<ValidateSsnOptions, 'allowPartial'> = {}
) {
  return yup
    .string()
    .transform((value) => {
      const v = (value ?? '').toString();
      const res = validateSsn(v, { ...opts, allowPartial: true });
      return res.ok ? res.normalized : v; // keep original if invalid; test will fail
    })
    .test('ssn-typing-valid', 'Invalid SSN', function (value) {
      const v = (value ?? '').toString();
      const res = validateSsn(v, { ...opts, allowPartial: true });
      return res.ok
        ? true
        : this.createError({
            message: (res as SsnValidationErrorResult).message,
          });
    });
}

/** Yup schema for full submit */
export function yupSsnSubmit(
  opts: Omit<ValidateSsnOptions, 'allowPartial'> = {}
) {
  return yup
    .string()
    .transform((value) => {
      const v = (value ?? '').toString();
      const res = validateSsn(v, { ...opts, allowPartial: false });
      return res.ok ? res.normalized : v;
    })
    .test('ssn-submit-valid', 'Invalid SSN', function (value) {
      const v = (value ?? '').toString();
      const res = validateSsn(v, { ...opts, allowPartial: false });
      return res.ok
        ? true
        : this.createError({
            message: (res as SsnValidationErrorResult).message,
          });
    });
}
