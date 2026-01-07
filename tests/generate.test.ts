import { generateSsn } from '../src/generate';
import {
  validateSsn,
  SsnValidationResult,
  SsnValidationErrorResult,
} from '../src/validate';

const PUBLICLY_ADVERTISED = [
  '078-05-1120',
  '721-07-4426',
  '219-09-9999',
] as const;

function assertInvalid(res: SsnValidationResult, expectedError: string) {
  expect(res.ok).toBe(false);
  if (res.ok) throw new Error('Expected ok=false');
  expect((res as SsnValidationErrorResult).error).toBe(expectedError);
}

function assertValid(res: SsnValidationResult) {
  expect(res.ok).toBe(true);
  if (!res.ok) throw new Error('Expected ok=true');
}

/**
 * Deterministic RNG helper.
 * Returns values in sequence; repeats the last value if you ask for more.
 */
function makeRng(seq: number[]) {
  let i = 0;
  return () => {
    const v = seq[Math.min(i, seq.length - 1)];
    i += 1;
    // clamp into [0, 1)
    return Math.max(0, Math.min(0.999999999, v));
  };
}

function isDashedSsn(s: string): boolean {
  return /^\d{3}-\d{2}-\d{4}$/.test(s);
}

function isDigitsSsn(s: string): boolean {
  return /^\d{9}$/.test(s);
}

describe('generateSsn', () => {
  test('mode=public returns one of the known publicly advertised SSNs (dashed default)', () => {
    const rng = makeRng([0]); // pick first
    const ssn = generateSsn({ mode: 'public', rng });
    expect(PUBLICLY_ADVERTISED).toContain(ssn);
    expect(isDashedSsn(ssn)).toBe(true);

    const res = validateSsn(ssn);
    assertInvalid(res, 'PUBLICLY_ADVERTISED');
  });

  test('mode=public can return digits-only format', () => {
    const rng = makeRng([0.8]); // pick last-ish
    const ssn = generateSsn({ mode: 'public', format: 'digits', rng });
    expect(isDigitsSsn(ssn)).toBe(true);
    expect(PUBLICLY_ADVERTISED.map((x) => x.replace(/-/g, ''))).toContain(ssn);

    const res = validateSsn(ssn); // allowNoDashes defaults to true
    assertInvalid(res, 'PUBLICLY_ADVERTISED');
  });

  test('mode=public publicValue forces specific advertised SSN', () => {
    const ssn = generateSsn({ mode: 'public', publicValue: '078-05-1120' });
    expect(ssn).toBe('078-05-1120');

    const res = validateSsn(ssn);
    assertInvalid(res, 'PUBLICLY_ADVERTISED');
  });

  test('mode=pre2011 generates SSNs that pass validation under pre2011 rules', () => {
    const rng = makeRng([0.123, 0.456, 0.789, 0.111, 0.222, 0.333]);

    for (let i = 0; i < 50; i++) {
      const ssn = generateSsn({ mode: 'pre2011', rng });
      expect(isDashedSsn(ssn)).toBe(true);

      const res = validateSsn(ssn, { ruleMode: 'pre2011' });
      assertValid(res);
    }
  });

  test('mode=post2011 generates SSNs that pass validation under post2011 rules', () => {
    const rng = makeRng([0.91, 0.92, 0.93, 0.94, 0.95, 0.96]);

    for (let i = 0; i < 50; i++) {
      const ssn = generateSsn({ mode: 'post2011', rng });
      expect(isDashedSsn(ssn)).toBe(true);

      const res = validateSsn(ssn, { ruleMode: 'post2011' });
      assertValid(res);
    }
  });

  test('mode="any" chooses pre or post based on rng (deterministic)', () => {
    // In generateSsn, mode="any" uses rng() < 0.5 => pre2011 else post2011.
    const rngPre = makeRng([0.1, 0.2, 0.3]); // first draw picks pre2011
    const ssnPre = generateSsn({ mode: 'any', rng: rngPre });
    const resPre = validateSsn(ssnPre, { ruleMode: 'pre2011' });
    assertValid(resPre);

    const rngPost = makeRng([0.9, 0.2, 0.3]); // first draw picks post2011
    const ssnPost = generateSsn({ mode: 'any', rng: rngPost });
    const resPost = validateSsn(ssnPost, { ruleMode: 'post2011' });
    assertValid(resPost);
  });

  test('format=digits returns ######### and still validates', () => {
    const rng = makeRng([0.12, 0.34, 0.56, 0.78]);

    const ssn = generateSsn({ mode: 'post2011', format: 'digits', rng });
    expect(isDigitsSsn(ssn)).toBe(true);

    const res = validateSsn(ssn, { ruleMode: 'post2011' });
    assertValid(res);
  });

  test('generated SSNs are never accidentally a publicly advertised SSN (unless mode=public)', () => {
    const rng = makeRng([0.001, 0.002, 0.003, 0.004, 0.005]);

    for (let i = 0; i < 200; i++) {
      const ssn = generateSsn({ mode: 'any', rng });
      expect(PUBLICLY_ADVERTISED).not.toContain(ssn);
    }
  });

  test('mode=pre2011 never generates an area in [734..749] or >= 773', () => {
    // This test doesn't rely on validateSsn; it checks the area directly.
    const rng = makeRng([0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);

    for (let i = 0; i < 200; i++) {
      const ssn = generateSsn({ mode: 'pre2011', rng });
      const area = Number(ssn.slice(0, 3));

      expect(area).not.toBe(0);
      expect(area).not.toBe(666);
      expect(area).toBeLessThan(900);

      expect(area < 734 || area > 749).toBe(true);
      expect(area).toBeLessThan(773);
    }
  });

  test('mode=post2011 can generate areas that are pre2011-only invalid (e.g. >= 773), but still not 900-999', () => {
    // Use an RNG that tends to pick higher numbers for area selection.
    // Note: randomInt maps rng to [1..899], so values close to 1 tend to yield ~899.
    const rng = makeRng([0.9999, 0.8888, 0.7777, 0.9999, 0.8888, 0.7777]);

    let sawPreOnlyInvalidArea = false;

    for (let i = 0; i < 200; i++) {
      const ssn = generateSsn({ mode: 'post2011', rng });
      const area = Number(ssn.slice(0, 3));
      expect(area).toBeGreaterThanOrEqual(1);
      expect(area).toBeLessThanOrEqual(899);
      expect(area).not.toBe(666);

      if ((area >= 734 && area <= 749) || area >= 773) {
        sawPreOnlyInvalidArea = true;
      }

      // It must validate for post2011
      assertValid(validateSsn(ssn, { ruleMode: 'post2011' }));
    }

    // Not guaranteed in theory, but with the chosen rng it should happen.
    expect(sawPreOnlyInvalidArea).toBe(true);
  });
});
