import { formatSsnFromDigits } from '../src/utils';

describe('formatSsnFromDigits', () => {
  test.each([
    // empty / very short
    ['', ''],
    ['1', '1'],
    ['12', '12'],
    ['123', '123'],

    // group boundary
    ['1234', '123-4'],
    ['12345', '123-45'],

    // serial boundary
    ['123456', '123-45-6'],
    ['1234567', '123-45-67'],
    ['12345678', '123-45-678'],
    ['123456789', '123-45-6789'],

    // longer than 9 digits (still deterministic)
    ['1234567890', '123-45-67890'],
    ['1234567890123', '123-45-67890123'],
  ])('formats "%s" -> "%s"', (input, expected) => {
    expect(formatSsnFromDigits(input)).toBe(expected);
  });

  test('does not modify non-digit characters (pure formatting only)', () => {
    // This function assumes digit input; it does not validate.
    expect(formatSsnFromDigits('abc')).toBe('abc');
    expect(formatSsnFromDigits('ab')).toBe('ab');
    expect(formatSsnFromDigits('abcd')).toBe('abc-d');
    expect(formatSsnFromDigits('abcde')).toBe('abc-de');
    expect(formatSsnFromDigits('abcdef')).toBe('abc-de-f');
  });

  test('is idempotent when applied multiple times to already formatted digit strings', () => {
    const once = formatSsnFromDigits('123456789');
    const twice = formatSsnFromDigits(once.replace(/-/g, ''));
    expect(once).toBe('123-45-6789');
    expect(twice).toBe('123-45-6789');
  });
});
