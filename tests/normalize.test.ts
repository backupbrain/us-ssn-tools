// tests/ssn.normalization.spec.ts
import { describe, it, expect } from '@jest/globals';
import { normalizeSsnInput } from '../src/normalize';
import { formatSsnFromDigits } from '../src/utils';

describe('formatSsnFromDigits', () => {
  it('formats prefixes correctly', () => {
    expect(formatSsnFromDigits('')).toBe('');
    expect(formatSsnFromDigits('1')).toBe('1');
    expect(formatSsnFromDigits('12')).toBe('12');
    expect(formatSsnFromDigits('123')).toBe('123');
    expect(formatSsnFromDigits('1234')).toBe('123-4');
    expect(formatSsnFromDigits('12345')).toBe('123-45');
    expect(formatSsnFromDigits('123456')).toBe('123-45-6');
    expect(formatSsnFromDigits('123456789')).toBe('123-45-6789');
  });
});

describe('normalizeSsnInput (full)', () => {
  it('accepts ###-##-#### and returns digits + normalized', () => {
    const res = normalizeSsnInput('123-45-6789', { allowPartial: false });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.digits).toBe('123456789');
    expect(res.normalized).toBe('123-45-6789');
  });

  it('accepts ######### when allowNoDashes=true', () => {
    const res = normalizeSsnInput('123456789', {
      allowPartial: false,
      allowNoDashes: true,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.digits).toBe('123456789');
    expect(res.normalized).toBe('123-45-6789');
  });

  it('rejects ######### when allowNoDashes=false', () => {
    const res = normalizeSsnInput('123456789', {
      allowPartial: false,
      allowNoDashes: false,
    });
    expect(res.ok).toBe(false);
  });

  it('rejects wrong dash placement', () => {
    const cases = ['12-345-6789', '1234-5-6789', '123-456-789', '123--45-6789'];
    for (const input of cases) {
      const res = normalizeSsnInput(input, { allowPartial: false });
      expect(res.ok).toBe(false);
    }
  });

  it('rejects non-digit characters and parsing tricks', () => {
    const cases = [
      '123-45-678x',
      '123-45-6789 ',
      ' 123-45-6789',
      '123 -45-6789',
      '123- 45-6789',
      '123-45- 6789',
      '1e10',
      '-102',
      '2.39',
      '😀',
    ];

    for (const input of cases) {
      const res = normalizeSsnInput(input, {
        allowPartial: false,
        allowNoDashes: true,
      });
      expect(res.ok).toBe(false);
    }
  });
});

describe('normalizeSsnInput (typing / partial)', () => {
  it('normalizes digit prefixes as you type', () => {
    const cases: Array<[string, string, string]> = [
      ['', '', ''],
      ['1', '1', '1'],
      ['12', '12', '12'],
      ['123', '123', '123'],
      ['1234', '1234', '123-4'],
      ['12345', '12345', '123-45'],
      ['123456', '123456', '123-45-6'],
      ['123456789', '123456789', '123-45-6789'],
    ];

    for (const [input, digits, normalized] of cases) {
      const res = normalizeSsnInput(input, {
        allowPartial: true,
        allowNoDashes: true,
      });
      expect(res.ok).toBe(true);
      if (!res.ok) continue;

      expect(res.digits).toBe(digits);
      expect(res.normalized).toBe(normalized);
    }
  });

  it('allows typing with dashes only at valid positions (after 3 and 5 digits)', () => {
    const okCases: Array<[string, string]> = [
      ['123-', '123'],
      ['123-4', '1234'],
      ['123-45-', '12345'],
      ['123-45-6', '123456'],
      ['123-45-6789', '123456789'],
      ['12345-6789', '123456789'], // dash after 5 digits is allowed even without dash after 3
      ['123-456789', '123456789'], // dash after 3 digits is allowed without second dash yet
    ];

    for (const [input, expectedDigits] of okCases) {
      const res = normalizeSsnInput(input, {
        allowPartial: true,
        allowNoDashes: true,
      });
      expect(res.ok).toBe(true);
      if (!res.ok) continue;

      expect(res.digits).toBe(expectedDigits);
      expect(res.normalized).toBe(formatSsnFromDigits(expectedDigits));
    }
  });

  it('rejects dashes in invalid positions', () => {
    const badCases = [
      '-', // dash before digits
      '1-', // dash after 1 digit
      '12-', // dash after 2 digits
      '123--', // duplicate dash at same position
      '123-4-', // dash after 4 digits
      '123-45--', // duplicate dash after 5 digits
      '123-45-6-', // third dash (after 6 digits)
      '1234-5', // dash after 4 digits
    ];

    for (const input of badCases) {
      const res = normalizeSsnInput(input, {
        allowPartial: true,
        allowNoDashes: true,
      });
      expect(res.ok).toBe(false);
    }
  });

  it('rejects invalid characters while typing (letters, spaces, emoji, etc.)', () => {
    const badCases = [
      '123 4',
      '123-4 5',
      '123-45-6789 ',
      ' 123',
      '123\t',
      'abc',
      '123-45-678x',
      '😀',
      '1e10',
      '-102',
      '2.39',
    ];

    for (const input of badCases) {
      const res = normalizeSsnInput(input, {
        allowPartial: true,
        allowNoDashes: true,
      });
      expect(res.ok).toBe(false);
    }
  });

  it('rejects > 9 digits while typing', () => {
    const res = normalizeSsnInput('1234567890', {
      allowPartial: true,
      allowNoDashes: true,
    });
    expect(res.ok).toBe(false);
  });

  it('rejects dashes entirely when allowNoDashes=false', () => {
    const ok = normalizeSsnInput('12345', {
      allowPartial: true,
      allowNoDashes: false,
    });
    expect(ok.ok).toBe(true);

    const bad = normalizeSsnInput('123-45', {
      allowPartial: true,
      allowNoDashes: false,
    });
    expect(bad.ok).toBe(false);
  });
});
