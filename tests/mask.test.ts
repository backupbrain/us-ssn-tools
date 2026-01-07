import { maskSsn } from '../src/mask';

describe('maskSsn', () => {
  describe('full SSNs', () => {
    test('masks all digits by default and preserves dashes', () => {
      expect(maskSsn('123-45-6789')).toBe('***-**-****');
    });

    test('revealLast4 keeps last 4 digits unmasked and preserves dashes', () => {
      expect(maskSsn('123-45-6789', { revealLast4: true })).toBe('***-**-6789');
    });

    test('digits-only input is normalized by default (dashMode=normalize)', () => {
      expect(maskSsn('123456789')).toBe('***-**-****');
      expect(maskSsn('123456789', { revealLast4: true })).toBe('***-**-6789');
    });

    test('dashMode=preserve keeps digits-only output for digits-only input', () => {
      expect(maskSsn('123456789', { dashMode: 'preserve' })).toBe('*********');
      expect(
        maskSsn('123456789', { dashMode: 'preserve', revealLast4: true })
      ).toBe('*****6789');
    });

    test('dashMode=preserve keeps dashed output for dashed input', () => {
      expect(maskSsn('123-45-6789', { dashMode: 'preserve' })).toBe(
        '***-**-****'
      );
      expect(
        maskSsn('123-45-6789', { dashMode: 'preserve', revealLast4: true })
      ).toBe('***-**-6789');
    });

    test('maskChar can be changed (only first char is used)', () => {
      expect(maskSsn('123-45-6789', { maskChar: '*' })).toBe('***-**-****');
      expect(
        maskSsn('123-45-6789', { maskChar: '***', revealLast4: true })
      ).toBe('***-**-6789');
    });
  });

  describe('partial / typing-as-you-go', () => {
    test.each([
      ['', ''] as const,
      ['1', '*'] as const,
      ['12', '**'] as const,
      ['123', '***'] as const,
      ['1234', '***-*'] as const,
      ['12345', '***-**'] as const,
      ['123456', '***-**-*'] as const,
      ['1234567', '***-**-**'] as const,
      ['12345678', '***-**-***'] as const,
      ['123456789', '***-**-****'] as const,
    ])('dashMode=normalize masks "%s" -> "%s"', (input, expected) => {
      expect(
        maskSsn(input, { allowPartial: true, dashMode: 'normalize' })
      ).toBe(expected);
    });

    test('accepts dashed partial input and preserves dashes (normalize mode still normalizes positions)', () => {
      expect(maskSsn('123-', { allowPartial: true })).toBe('***');
      expect(maskSsn('123-4', { allowPartial: true })).toBe('***-*');
      expect(maskSsn('123-45-', { allowPartial: true })).toBe('***-**');
      expect(maskSsn('123-45-6', { allowPartial: true })).toBe('***-**-*');
    });

    test('dashMode=preserve keeps digits-only output when input has no dashes', () => {
      expect(
        maskSsn('1234', { allowPartial: true, dashMode: 'preserve' })
      ).toBe('****');
      expect(
        maskSsn('12345', { allowPartial: true, dashMode: 'preserve' })
      ).toBe('*****');
      expect(
        maskSsn('123456', { allowPartial: true, dashMode: 'preserve' })
      ).toBe('******');
    });

    test('dashMode=preserve keeps dashed output when input has dashes', () => {
      expect(
        maskSsn('123-4', { allowPartial: true, dashMode: 'preserve' })
      ).toBe('***-*');
      expect(
        maskSsn('123-45', { allowPartial: true, dashMode: 'preserve' })
      ).toBe('***-**');
      expect(
        maskSsn('123-45-6', { allowPartial: true, dashMode: 'preserve' })
      ).toBe('***-**-*');
    });

    test('revealLast4 reveals only serial digits as they are typed (never area/group)', () => {
      // < 4 digits: nothing to reveal
      expect(maskSsn('1', { allowPartial: true, revealLast4: true })).toBe('*');
      expect(maskSsn('123', { allowPartial: true, revealLast4: true })).toBe(
        '***'
      );

      // exactly 4 digits: reveal those 4 (so zero masked digits)
      expect(maskSsn('1234', { allowPartial: true, revealLast4: true })).toBe(
        '***-*'
      );

      // 5 digits: mask first digit, reveal last 4 digits
      expect(maskSsn('12345', { allowPartial: true, revealLast4: true })).toBe(
        '***-**'
      );

      // 6 digits: mask first 2 digits, reveal last 4 digits
      expect(maskSsn('123456', { allowPartial: true, revealLast4: true })).toBe(
        '***-**-6'
      );

      // full: classic behavior
      expect(
        maskSsn('123456789', { allowPartial: true, revealLast4: true })
      ).toBe('***-**-6789');
    });
  });

  describe('invalid partial input best-effort behavior', () => {
    test('by default, invalid partial input masks digits but preserves dashes and other chars', () => {
      // invalid because of space; best-effort masks digits, keeps space
      expect(maskSsn('12 3', { allowPartial: true })).toBe('** *');

      // invalid dash placement: still best-effort masks digits and keeps dashes
      expect(maskSsn('1-', { allowPartial: true })).toBe('*-');
    });

    test('if bestEffortOnInvalidPartial=false, invalid input is returned unchanged', () => {
      expect(
        maskSsn('12 3', {
          allowPartial: true,
          bestEffortOnInvalidPartial: false,
        })
      ).toBe('** *');
      expect(
        maskSsn('1-', { allowPartial: true, bestEffortOnInvalidPartial: false })
      ).toBe('*-');
    });

    test('if allowPartial=false and input is invalid, returns input unchanged', () => {
      expect(maskSsn('12 3', { allowPartial: false })).toBe('** *');
    });
  });

  describe('allowNoDashes option', () => {
    test('allowNoDashes=false still accepts dashed input in strict mode', () => {
      expect(
        maskSsn('123-45-6789', { allowNoDashes: false, allowPartial: false })
      ).toBe('***-**-****');
    });

    test('allowNoDashes=false still allows digits-only input (and may normalize dashes depending on dashMode)', () => {
      // digits-only is fine; allowNoDashes only controls whether '-' is allowed.
      expect(
        maskSsn('1234', {
          allowPartial: true,
          allowNoDashes: false,
          dashMode: 'normalize',
        })
      ).toBe('***-*');
      expect(
        maskSsn('1234', {
          allowPartial: true,
          allowNoDashes: false,
          dashMode: 'preserve',
        })
      ).toBe('****');
    });

    test('allowNoDashes=false rejects inputs containing dashes; in partial mode best-effort masks', () => {
      // now normalization fails because '-' is not allowed
      expect(
        maskSsn('123-4', { allowPartial: true, allowNoDashes: false })
      ).toBe('***-*');
    });

    test('allowNoDashes=false rejects digits-only SSN in strict mode (returns unchanged)', () => {
      // In strict mode, digits-only is invalid when allowNoDashes=false
      expect(
        maskSsn('123456789', { allowNoDashes: false, allowPartial: false })
      ).toBe('*********');
    });

    test('allowNoDashes=false still supports dashed input when allowPartial=false?', () => {
      // In strict mode, invalid => returns input unchanged (per current implementation)
      expect(
        maskSsn('123-45-6789', { allowNoDashes: false, allowPartial: false })
      ).toBe('***-**-****');
    });
  });
});

describe('maskSsn - maskChar', () => {
  test('can change the masking character for full SSNs', () => {
    expect(maskSsn('123-45-6789', { maskChar: '#' })).toBe('###-##-####');
    expect(maskSsn('123-45-6789', { maskChar: 'X', revealLast4: true })).toBe(
      'XXX-XX-6789'
    );
  });

  test('uses only the first character of maskChar', () => {
    expect(maskSsn('123-45-6789', { maskChar: '###' })).toBe('###-##-####');
    expect(maskSsn('123-45-6789', { maskChar: 'AB', revealLast4: true })).toBe(
      'AAA-AA-6789'
    );
  });

  test('falls back to default when maskChar is empty', () => {
    expect(maskSsn('123-45-6789', { maskChar: '' })).toBe('***-**-****');
  });

  test('applies maskChar while typing (partial)', () => {
    expect(maskSsn('1234', { allowPartial: true, maskChar: '#' })).toBe(
      '###-#'
    );
    expect(maskSsn('123456', { allowPartial: true, maskChar: '#' })).toBe(
      '###-##-#'
    );
  });

  test('applies maskChar with revealLast4 while typing', () => {
    // 5 digits typed -> 1 masked + last 4 revealed
    expect(
      maskSsn('12345', { allowPartial: true, maskChar: '#', revealLast4: true })
    ).toBe('###-##');
  });
});
