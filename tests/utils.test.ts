import { formatSsnFromDigits, formatSsnWithOverflow } from '../src/utils';

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

describe('formatSsnWithOverflow', () => {
  test.each([
    // empty / very short
    ['', ''],
    ['1', '1'],
    ['12', '12'],
    ['123', '123'],

    // dash boundaries
    ['1234', '123-4'],
    ['12345', '123-45'],
    ['123456', '123-45-6'],
    ['1234567', '123-45-67'],
    ['12345678', '123-45-678'],
    ['123456789', '123-45-6789'],

    // overflow
    ['1234567890', '123-45-67890'],
    ['12345678999', '123-45-678999'],
    ['123456789123456', '123-45-6789123456'],
  ])('formats "%s" -> "%s"', (input, expected) => {
    expect(formatSsnWithOverflow(input)).toBe(expected);
  });

  test('does not validate or strip non-digit characters', () => {
    // formatSsnFromDigits itself doesn't validate; overflow wrapper shouldn't either
    expect(formatSsnWithOverflow('abc')).toBe('abc');
    expect(formatSsnWithOverflow('abcdefghi')).toBe('abc-de-fghi');
    expect(formatSsnWithOverflow('abcdefghiXYZ')).toBe('abc-de-fghiXYZ');
  });

  test('formats only the first 9 characters, appends overflow verbatim', () => {
    const input = '123456789XXXX';
    const out = formatSsnWithOverflow(input);

    expect(out.startsWith('123-45-6789')).toBe(true);
    expect(out.endsWith('XXXX')).toBe(true);
  });

  test('is stable when applied multiple times to the same digit string', () => {
    const once = formatSsnWithOverflow('12345678999');
    const twice = formatSsnWithOverflow('12345678999');

    expect(once).toBe('123-45-678999');
    expect(twice).toBe('123-45-678999');
  });

  test('works correctly for very long strings', () => {
    const input = '1'.repeat(50);
    const out = formatSsnWithOverflow(input);

    expect(out.startsWith('111-11-1111')).toBe(true);
    expect(out.length).toBe(50 + 2); // two dashes inserted
  });
});
