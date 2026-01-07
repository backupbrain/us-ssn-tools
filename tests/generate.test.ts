import { generateSsn } from '../src/generate';
import { isValidSsn } from '../src/validate';

const PUBLICLY_ADVERTISED = [
  '078-05-1120',
  '721-07-4426',
  '219-09-9999',
] as const;
const PUBLIC_DIGITS = PUBLICLY_ADVERTISED.map((s) => s.replace(/-/g, ''));

describe('generateSsn', () => {
  test("defaults to mode='public' (dashed)", () => {
    const ssn = generateSsn();
    expect(PUBLICLY_ADVERTISED).toContain(ssn);
  });

  test("mode='public' respects digitsOnly=true", () => {
    const ssn = generateSsn({ digitsOnly: true });
    expect(PUBLIC_DIGITS).toContain(ssn);
    expect(ssn).toMatch(/^\d{9}$/);
  });

  test("mode='public' respects digitsOnly=false", () => {
    const ssn = generateSsn({ mode: 'public', digitsOnly: false });
    expect(PUBLICLY_ADVERTISED).toContain(ssn);
    expect(ssn).toMatch(/^\d{3}-\d{2}-\d{4}$/);
  });

  describe.each([
    ['pre2011'] as const,
    ['post2011'] as const,
    ['any'] as const,
  ])("mode='%s' (non-public)", (mode) => {
    test('generates dashed SSN by default', () => {
      const ssn = generateSsn({ mode });
      expect(ssn).toMatch(/^\d{3}-\d{2}-\d{4}$/);
      expect(PUBLICLY_ADVERTISED).not.toContain(ssn);

      // validate with requireDashes=true (default) and ruleMode corresponding to the mode
      if (mode === 'pre2011') {
        expect(
          isValidSsn(ssn, { ruleMode: 'pre2011', requireDashes: true })
        ).toBe(true);
      } else if (mode === 'post2011') {
        expect(
          isValidSsn(ssn, { ruleMode: 'post2011', requireDashes: true })
        ).toBe(true);
      } else {
        // "any" should be valid under at least post2011 (since post2011 is less strict on area)
        expect(
          isValidSsn(ssn, { ruleMode: 'post2011', requireDashes: true })
        ).toBe(true);
      }
    });

    test('generates digits-only when digitsOnly=true', () => {
      const ssn = generateSsn({ mode, digitsOnly: true });
      expect(ssn).toMatch(/^\d{9}$/);
      expect(PUBLIC_DIGITS).not.toContain(ssn);

      // validate with requireDashes=false
      if (mode === 'pre2011') {
        expect(
          isValidSsn(ssn, { ruleMode: 'pre2011', requireDashes: false })
        ).toBe(true);
      } else if (mode === 'post2011') {
        expect(
          isValidSsn(ssn, { ruleMode: 'post2011', requireDashes: false })
        ).toBe(true);
      } else {
        expect(
          isValidSsn(ssn, { ruleMode: 'post2011', requireDashes: false })
        ).toBe(true);
      }
    });
  });

  test('does not generate invalid base-rule values (area/group/serial)', () => {
    // Run multiple times to catch regression in generator constraints.
    for (let i = 0; i < 200; i++) {
      const ssn = generateSsn({ mode: 'post2011' });

      // base rules: not 000, not 666, not 900-999
      const area = Number(ssn.slice(0, 3));
      expect(area).not.toBe(0);
      expect(area).not.toBe(666);
      expect(area).toBeLessThan(900);

      // group not 00
      const group = Number(ssn.slice(4, 6));
      expect(group).not.toBe(0);

      // serial not 0000
      const serial = Number(ssn.slice(7, 11));
      expect(serial).not.toBe(0);

      // also ensure it validates
      expect(
        isValidSsn(ssn, { ruleMode: 'post2011', requireDashes: true })
      ).toBe(true);
    }
  });

  test('pre2011 never generates disallowed area ranges (734-749, >=773)', () => {
    for (let i = 0; i < 300; i++) {
      const ssn = generateSsn({ mode: 'pre2011' });
      const area = Number(ssn.slice(0, 3));

      expect(area).toBeGreaterThanOrEqual(1);
      expect(area).toBeLessThan(900);
      expect(area).not.toBe(666);

      expect(area < 734 || area > 749).toBe(true);
      expect(area).toBeLessThan(773);

      expect(
        isValidSsn(ssn, { ruleMode: 'pre2011', requireDashes: true })
      ).toBe(true);
    }
  });
});
