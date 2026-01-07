import { normalizeSsn } from '../src/normalize';

describe('normalizeSsn (string-only UI normalizer)', () => {
  describe('defaults', () => {
    test.each([
      ['', ''],
      ['1', '1'],
      ['12', '12'],
      ['123', '123'],
      ['1234', '123-4'],
      ['12345', '123-45'],
      ['123456', '123-45-6'],
      ['1234567', '123-45-67'],
      ['12345678', '123-45-678'],
      ['123456789', '123-45-6789'],
      ['1234567890', '123-45-6789'],
    ])('default normalizes "%s" -> "%s"', (input, expected) => {
      expect(normalizeSsn(input)).toBe(expected);
    });

    test('extracts digits from mixed input (best-effort)', () => {
      expect(normalizeSsn('12a3-4')).toBe('123-4');
      expect(normalizeSsn('SSN: 123 45 6789')).toBe('123-45-6789');
      expect(normalizeSsn('123😀45😅6789')).toBe('123-45-6789');
    });

    test('allows overflow digits and appends after serial', () => {
      expect(normalizeSsn('1234567890', { enforceLength: false })).toBe(
        '123-45-67890'
      );
      expect(normalizeSsn('12345678999', { enforceLength: false })).toBe(
        '123-45-678999'
      );
    });
  });

  describe('digitsOnly', () => {
    test.each([
      ['', ''],
      ['1', '1'],
      ['1234', '1234'],
      ['123-45-6789', '123456789'],
      ['SSN: 123 45 6789', '123456789'],
    ])('digitsOnly extracts digits "%s" -> "%s"', (input, expected) => {
      expect(normalizeSsn(input, { digitsOnly: true })).toBe(expected);
    });

    test('digitsOnly keeps overflow digits when enforceLength=false', () => {
      expect(
        normalizeSsn('12345678999', { digitsOnly: true, enforceLength: false })
      ).toBe('12345678999');
    });

    test('digitsOnly caps to 9 digits when enforceLength=true', () => {
      expect(
        normalizeSsn('12345678999', { digitsOnly: true, enforceLength: true })
      ).toBe('123456789');
    });
  });

  describe('enforceLength (dashed)', () => {
    test('caps to 9 digits and formats as SSN-shaped output', () => {
      expect(normalizeSsn('12345678999', { enforceLength: true })).toBe(
        '123-45-6789'
      );
      expect(
        normalizeSsn('SSN: 123 45 6789 999', { enforceLength: true })
      ).toBe('123-45-6789');
    });

    test('with enforceLength=true still formats partial prefixes as you type', () => {
      expect(normalizeSsn('1234', { enforceLength: true })).toBe('123-4');
      expect(normalizeSsn('123456', { enforceLength: true })).toBe('123-45-6');
    });
  });

  describe('allowPartial=false', () => {
    test('returns input unchanged until full 9 digits are present', () => {
      expect(normalizeSsn('1234', { allowPartial: false })).toBe('1234');
      expect(normalizeSsn('123-45-6', { allowPartial: false })).toBe(
        '123-45-6'
      );
      expect(normalizeSsn('SSN: 123 45', { allowPartial: false })).toBe(
        'SSN: 123 45'
      );
    });

    test('formats once 9 digits are present (and uses only first 9 if there are more)', () => {
      expect(normalizeSsn('123456789', { allowPartial: false })).toBe(
        '123-45-6789'
      );
      expect(normalizeSsn('12345678999', { allowPartial: false })).toBe(
        '123-45-6789'
      );
    });

    test('if enforceLength=true, still formats once 9 digits are available from the input', () => {
      expect(
        normalizeSsn('SSN: 123 45 6789 999', {
          allowPartial: false,
          enforceLength: true,
        })
      ).toBe('123-45-6789');
    });
  });

  describe('edge cases', () => {
    test('ignores non-digits entirely (dashed mode), possibly producing empty string', () => {
      expect(normalizeSsn('----')).toBe('');
      expect(normalizeSsn('abc')).toBe('');
      expect(normalizeSsn('😀')).toBe('');
    });

    test('does not trim or modify raw input when allowPartial=false and not enough digits', () => {
      expect(normalizeSsn(' 123', { allowPartial: false })).toBe(' 123');
      expect(normalizeSsn('123 ', { allowPartial: false })).toBe('123 ');
    });
  });
});
