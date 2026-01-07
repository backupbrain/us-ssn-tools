import { maskSsn } from '../src/mask';

describe('maskSsn (normalize -> mask -> format)', () => {
  describe('defaults', () => {
    test('masks full dashed SSN and preserves dash formatting', () => {
      expect(maskSsn('123-45-6789')).toBe('***-**-****');
    });

    test('masks full digits-only SSN but outputs dashed by default', () => {
      expect(maskSsn('123456789')).toBe('***-**-****');
    });

    test('masks partial as you type (default allowPartial=true)', () => {
      expect(maskSsn('1')).toBe('*');
      expect(maskSsn('12')).toBe('**');
      expect(maskSsn('123')).toBe('***');
      expect(maskSsn('1234')).toBe('***-*');
      expect(maskSsn('12345')).toBe('***-**');
      expect(maskSsn('123456')).toBe('***-**-*');
      expect(maskSsn('1234567')).toBe('***-**-**');
      expect(maskSsn('12345678')).toBe('***-**-***');
      expect(maskSsn('123456789')).toBe('***-**-****');
    });

    test('extracts digits from mixed input (UI best-effort)', () => {
      expect(maskSsn('SSN: 12a3-4')).toBe('***-*');
      expect(maskSsn('SSN: 123 45 6789')).toBe('***-**-****');
      expect(maskSsn('123😀45😅6789')).toBe('***-**-****');
    });
  });

  describe('digitsOnly', () => {
    test('digitsOnly=true returns masked digits without dashes', () => {
      expect(maskSsn('123-45-6789', { digitsOnly: true })).toBe('*********');
      expect(maskSsn('123456789', { digitsOnly: true })).toBe('*********');
    });

    test('digitsOnly=true preserves partial length without inserting dashes', () => {
      expect(maskSsn('1234', { digitsOnly: true })).toBe('****');
      expect(maskSsn('12345', { digitsOnly: true })).toBe('*****');
      expect(maskSsn('123456', { digitsOnly: true })).toBe('******');
    });
  });

  describe('maskChar', () => {
    test('can change maskChar (only first char is used)', () => {
      expect(maskSsn('123-45-6789', { maskChar: '•' })).toBe('•••-••-••••');
      expect(maskSsn('123-45-6789', { maskChar: '***' })).toBe('***-**-****');
      expect(maskSsn('123456789', { digitsOnly: true, maskChar: 'X' })).toBe(
        'XXXXXXXXX'
      );
    });

    test("empty maskChar falls back to '*'", () => {
      expect(maskSsn('123-45-6789', { maskChar: '' })).toBe('***-**-****');
    });
  });

  describe('revealLast4 (serial-only reveal)', () => {
    test('does not reveal anything before serial begins (<=5 digits)', () => {
      expect(maskSsn('12345', { revealLast4: true })).toBe('***-**');
      expect(maskSsn('123-45', { revealLast4: true })).toBe('***-**');
    });

    test('reveals serial digits as they are typed (6..9 digits)', () => {
      expect(maskSsn('123456', { revealLast4: true })).toBe('***-**-6');
      expect(maskSsn('1234567', { revealLast4: true })).toBe('***-**-67');
      expect(maskSsn('12345678', { revealLast4: true })).toBe('***-**-678');
      expect(maskSsn('123456789', { revealLast4: true })).toBe('***-**-6789');

      // dashed input should behave the same
      expect(maskSsn('123-45-6', { revealLast4: true })).toBe('***-**-6');
    });

    test('digitsOnly + revealLast4 reveals the last serial digits while masking earlier digits', () => {
      expect(maskSsn('123456', { digitsOnly: true, revealLast4: true })).toBe(
        '*****6'
      );
      expect(
        maskSsn('123456789', { digitsOnly: true, revealLast4: true })
      ).toBe('*****6789');
    });
  });

  describe('allowPartial', () => {
    test('allowPartial=false does not format partial input; still masks digits it can extract', () => {
      // normalizeSsnInput with allowPartial=false returns input unchanged if not 9 digits,
      // but maskSsn normalizes digitsOnly:true, so it still extracts digits and masks them.
      expect(maskSsn('1234', { allowPartial: false })).toBe('***-*'); // because formatting happens after masking
      expect(maskSsn('12a3', { allowPartial: false, digitsOnly: true })).toBe(
        '***'
      );
    });

    test('allowPartial=false formats once 9 digits exist', () => {
      expect(maskSsn('123456789', { allowPartial: false })).toBe('***-**-****');
      expect(maskSsn('123-45-6789', { allowPartial: false })).toBe(
        '***-**-****'
      );
    });
  });

  describe('overflow digits + enforceLength', () => {
    test('by default (enforceLength=false) allows overflow digits and appends after serial in dashed output', () => {
      expect(maskSsn('1234567890')).toBe('***-**-*****'); // 10 digits => 9 masked as "***-**-****" + extra "*"
      expect(maskSsn('12345678999')).toBe('***-**-******'); // 11 digits => 9 masked + 2 masked overflow
    });

    test('digitsOnly keeps overflow in masked output when enforceLength=false', () => {
      expect(maskSsn('12345678999', { digitsOnly: true })).toBe('***********');
    });

    test('enforceLength=true caps at 9 digits', () => {
      expect(maskSsn('12345678999', { enforceLength: true })).toBe(
        '***-**-****'
      );
      expect(
        maskSsn('12345678999', { enforceLength: true, digitsOnly: true })
      ).toBe('*********');
    });

    test('enforceLength=true + revealLast4 reveals only within first 9 digits', () => {
      expect(
        maskSsn('12345678999', { enforceLength: true, revealLast4: true })
      ).toBe('***-**-6789');
      expect(
        maskSsn('12345678999', {
          enforceLength: true,
          digitsOnly: true,
          revealLast4: true,
        })
      ).toBe('*****6789');
    });
  });

  describe('non-digit-only input edge cases', () => {
    test('returns empty string when no digits exist (dashed output)', () => {
      expect(maskSsn('abc')).toBe('');
      expect(maskSsn('----')).toBe('');
      expect(maskSsn('😀')).toBe('');
    });

    test('returns empty string when no digits exist (digitsOnly)', () => {
      expect(maskSsn('abc', { digitsOnly: true })).toBe('');
    });
  });
});
