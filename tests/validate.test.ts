import { isValidSsn } from '../src/validate';

describe('isValidSsn', () => {
  describe('defaults', () => {
    test('default requires dashes and requires full SSN', () => {
      // requireDashes defaults to true
      expect(isValidSsn('123-45-6789')).toBe(true);
      expect(isValidSsn('123456789')).toBe(false);

      // allowPartial defaults to false
      expect(isValidSsn('123-45-6')).toBe(false);
      expect(isValidSsn('123')).toBe(false);
    });

    test('default ruleMode is post2011', () => {
      // 773 is allowed in post2011
      expect(isValidSsn('773-12-3456')).toBe(true);
    });
  });

  describe('format rules', () => {
    test('requireDashes=false accepts digits-only and dashed full SSNs', () => {
      expect(isValidSsn('123456789', { requireDashes: false })).toBe(true);
      expect(isValidSsn('123-45-6789', { requireDashes: false })).toBe(true);
    });

    test('rejects wrong formatting', () => {
      const bad = [
        '123-456-789',
        '12-345-6789',
        '123--45-6789',
        '123-45-678',
        '123-45-67890',
        'abc',
        '1e10',
        '2.39',
        '😀',
      ];
      for (const input of bad) {
        expect(isValidSsn(input)).toBe(false);
      }
    });
  });

  describe('publicly advertised SSNs', () => {
    test.each(['078-05-1120', '721-07-4426', '219-09-9999'])(
      'rejects publicly advertised SSN %s',
      (ssn) => {
        expect(isValidSsn(ssn)).toBe(false);
        expect(
          isValidSsn(ssn.replace(/-/g, ''), { requireDashes: false })
        ).toBe(false);
      }
    );
  });

  describe('base SSN rules (always apply)', () => {
    test('rejects invalid area numbers: 000, 666, 900-999', () => {
      expect(isValidSsn('000-12-3456')).toBe(false);
      expect(isValidSsn('666-12-3456')).toBe(false);
      expect(isValidSsn('900-12-3456')).toBe(false);
      expect(isValidSsn('999-12-3456')).toBe(false);
    });

    test('rejects group 00', () => {
      expect(isValidSsn('123-00-6789')).toBe(false);
    });

    test('rejects serial 0000', () => {
      expect(isValidSsn('123-45-0000')).toBe(false);
    });

    test('accepts nearby valid areas', () => {
      expect(isValidSsn('665-12-3456')).toBe(true);
      expect(isValidSsn('667-12-3456')).toBe(true);
      expect(isValidSsn('899-12-3456')).toBe(true);
    });
  });

  describe('ruleMode: pre2011 vs post2011', () => {
    test('pre2011 rejects 734-749 and >= 773', () => {
      const bad = ['734-12-3456', '749-12-3456', '773-12-3456', '899-12-3456'];
      for (const ssn of bad) {
        expect(isValidSsn(ssn, { ruleMode: 'pre2011' })).toBe(false);
      }
    });

    test('post2011 allows areas that are only invalid pre2011', () => {
      const ok = ['734-12-3456', '749-12-3456', '773-12-3456', '899-12-3456'];
      for (const ssn of ok) {
        expect(isValidSsn(ssn, { ruleMode: 'post2011' })).toBe(true);
      }
    });
  });

  describe('allowPartial (valid-so-far semantics)', () => {
    test('requireDashes=true: dashed prefixes only (digits beyond 3 require dash)', () => {
      // prefixes allowed
      expect(isValidSsn('', { allowPartial: true })).toBe(true);
      expect(isValidSsn('1', { allowPartial: true })).toBe(true);
      expect(isValidSsn('12', { allowPartial: true })).toBe(true);
      expect(isValidSsn('123', { allowPartial: true })).toBe(true);
      expect(isValidSsn('123-', { allowPartial: true })).toBe(true);
      expect(isValidSsn('123-4', { allowPartial: true })).toBe(true);
      expect(isValidSsn('123-45', { allowPartial: true })).toBe(true);
      expect(isValidSsn('123-45-', { allowPartial: true })).toBe(true);
      expect(isValidSsn('123-45-6', { allowPartial: true })).toBe(true);

      // digits-only beyond 3 is NOT a valid dashed prefix
      expect(isValidSsn('1234', { allowPartial: true })).toBe(false);
      expect(isValidSsn('12345', { allowPartial: true })).toBe(false);
    });

    test('requireDashes=true: rejects dashes in wrong positions while typing', () => {
      const bad = ['-', '1-', '12-', '123--', '123-4-', '123-45--', '1234-5'];
      for (const input of bad) {
        expect(isValidSsn(input, { allowPartial: true })).toBe(false);
      }
    });

    test('requireDashes=false: accepts digits-only prefixes and dashed prefixes', () => {
      expect(
        isValidSsn('1234', { allowPartial: true, requireDashes: false })
      ).toBe(true);
      expect(
        isValidSsn('12345', { allowPartial: true, requireDashes: false })
      ).toBe(true);
      expect(
        isValidSsn('123456', { allowPartial: true, requireDashes: false })
      ).toBe(true);

      expect(
        isValidSsn('123-4', { allowPartial: true, requireDashes: false })
      ).toBe(true);
      expect(
        isValidSsn('123-45-6', { allowPartial: true, requireDashes: false })
      ).toBe(true);
    });

    test('applies progressive validity checks in partial mode', () => {
      // As soon as area is complete, area rules apply
      expect(isValidSsn('000', { allowPartial: true })).toBe(false);
      expect(isValidSsn('666', { allowPartial: true })).toBe(false);
      expect(isValidSsn('900', { allowPartial: true })).toBe(false);

      // Group rule applies once group is complete (5 digits)
      expect(isValidSsn('123-00', { allowPartial: true })).toBe(false);
      expect(isValidSsn('123-01', { allowPartial: true })).toBe(true);

      // Serial rule applies only when full 9 digits are present
      expect(isValidSsn('123-45-0', { allowPartial: true })).toBe(true);
      expect(isValidSsn('123-45-0000', { allowPartial: true })).toBe(false);
    });

    test('pre2011 rules in partial mode apply once area is complete', () => {
      expect(
        isValidSsn('773', {
          allowPartial: true,
          requireDashes: false,
          ruleMode: 'pre2011',
        })
      ).toBe(false);
      expect(
        isValidSsn('772', {
          allowPartial: true,
          requireDashes: false,
          ruleMode: 'pre2011',
        })
      ).toBe(true);
    });

    test('rejects more than 9 digits while typing', () => {
      expect(isValidSsn('123-45-67890', { allowPartial: true })).toBe(false);
      expect(
        isValidSsn('1234567890', { allowPartial: true, requireDashes: false })
      ).toBe(false);
    });
  });
});
