import { validateSsn } from '../src/validate';
import type {
  SsnValidationFailureReason,
  SsnValidationResult,
} from '../src/validate';

type SsnValid = Extract<SsnValidationResult, { ok: true }>;
type SsnInvalid = Extract<SsnValidationResult, { ok: false }>;

function assertValid(res: SsnValidationResult): asserts res is SsnValid {
  expect(res.ok).toBe(true);
  if (res.ok !== true) {
    throw new Error('Expected ok=true');
  }
}

function assertInvalid(res: SsnValidationResult): asserts res is SsnInvalid {
  expect(res.ok).toBe(false);
  if (res.ok !== false) {
    throw new Error('Expected ok=false');
  }
}

function expectInvalid(
  res: SsnValidationResult,
  error: SsnValidationFailureReason
) {
  assertInvalid(res);
  expect(res.error).toBe(error);
  return res;
}

function expectValid(res: SsnValidationResult, normalized?: string) {
  assertValid(res);
  if (normalized !== undefined) expect(res.normalized).toBe(normalized);
  return res;
}

describe('validateSsn (full / strict)', () => {
  test('accepts valid formatted SSN', () => {
    expectValid(validateSsn('123-45-6789'), '123-45-6789');
  });

  test('accepts 9 digits by default and normalizes with dashes', () => {
    expectValid(validateSsn('123456789'), '123-45-6789');
  });

  test('rejects wrong format', () => {
    const bad = [
      '123-456-789',
      '12-345-6789',
      '123--45-6789',
      '1e10',
      '2.39',
      '😀',
    ];
    for (const input of bad) {
      expectInvalid(validateSsn(input), 'INVALID_FORMAT');
    }
  });

  test('rejects publicly advertised SSNs', () => {
    const bad = ['078-05-1120', '721-07-4426', '219-09-9999'];
    for (const input of bad) {
      expectInvalid(validateSsn(input), 'PUBLICLY_ADVERTISED');
    }
  });

  describe('Area rules (base)', () => {
    test.each([
      ['000-12-3456', 'INVALID_AREA'],
      ['666-12-3456', 'INVALID_AREA'],
      ['900-12-3456', 'INVALID_AREA'],
      ['999-12-3456', 'INVALID_AREA'],
    ] satisfies Array<[string, SsnValidationFailureReason]>)(
      'rejects reserved area %s',
      (input, err) => {
        expectInvalid(validateSsn(input), err);
      }
    );

    test.each(['001-12-3456', '665-12-3456', '667-12-3456', '899-12-3456'])(
      'accepts allowed area %s',
      (input) => {
        expectValid(validateSsn(input));
      }
    );
  });

  describe('Group + serial rules', () => {
    test('rejects group 00', () => {
      expectInvalid(validateSsn('123-00-6789'), 'INVALID_GROUP');
    });

    test('rejects serial 0000', () => {
      expectInvalid(validateSsn('123-45-0000'), 'INVALID_SERIAL');
    });

    test('rejects group 00 and serial 0000 together (deterministic precedence)', () => {
      // your implementation checks group before serial
      expectInvalid(validateSsn('123-00-0000'), 'INVALID_GROUP');
    });
  });

  describe('ruleMode behavior (pre2011 vs post2011 vs both)', () => {
    test('pre2011 rejects 734-749 and >= 773', () => {
      const bad = ['734-12-3456', '749-12-3456', '773-12-3456'];
      for (const input of bad) {
        expectInvalid(
          validateSsn(input, { ruleMode: 'pre2011' }),
          'INVALID_AREA'
        );
      }
    });

    test('post2011 allows areas that are only invalid under pre2011 rules', () => {
      const ok = ['734-12-3456', '749-12-3456', '773-12-3456', '899-12-3456'];
      for (const input of ok) {
        expectValid(validateSsn(input, { ruleMode: 'post2011' }));
      }
    });

    test('"both" (default) accepts areas that fail pre2011 but pass post2011', () => {
      // invalid pre2011-only, valid post2011
      expectValid(validateSsn('773-12-3456'), '773-12-3456');
    });

    test('"both" still rejects base-invalid areas', () => {
      expectInvalid(validateSsn('900-12-3456'), 'INVALID_AREA');
    });
  });

  describe('allowNoDashes option', () => {
    test('allowNoDashes=false rejects digit-only SSN', () => {
      expectInvalid(
        validateSsn('123456789', { allowNoDashes: false }),
        'INVALID_FORMAT'
      );
    });

    test('allowNoDashes=false still accepts dashed SSN', () => {
      expectValid(
        validateSsn('123-45-6789', { allowNoDashes: false }),
        '123-45-6789'
      );
    });
  });
});

describe('validateSsn (typing / allowPartial)', () => {
  test.each([
    ['', true, ''],
    ['1', true, '1'],
    ['12', true, '12'],
    ['123', true, '123'],
    ['1234', true, '123-4'],
    ['12345', true, '123-45'],
    ['123456', true, '123-45-6'],
    ['123456789', true, '123-45-6789'],
    ['123-', true, '123'],
    ['123-4', true, '123-4'],
    ['123-45-', true, '123-45'],
    ['123-45-6', true, '123-45-6'],
    ['12345-6789', true, '123-45-6789'],
  ])('partial input %p', (input, ok, normalized) => {
    const res = validateSsn(input, { allowPartial: true });
    if (ok) expectValid(res, normalized);
    else expect(res.ok).toBe(false);
  });

  test('rejects impossible prefixes early (area starts with 9)', () => {
    expectInvalid(validateSsn('9', { allowPartial: true }), 'INVALID_AREA');
  });

  test('rejects invalid dash placements while typing', () => {
    const bad = ['-', '1-', '12-', '123--', '123-4-', '123-45--', '1234-5'];
    for (const input of bad) {
      expectInvalid(
        validateSsn(input, { allowPartial: true }),
        'INVALID_FORMAT'
      );
    }
  });

  test('once group is complete, group=00 becomes invalid', () => {
    expectValid(validateSsn('123-0', { allowPartial: true })); // still possible

    expectInvalid(
      validateSsn('123-00', { allowPartial: true }),
      'INVALID_GROUP'
    );
  });

  test('once serial is complete, serial=0000 becomes invalid', () => {
    expectValid(validateSsn('123-45-0', { allowPartial: true })); // still possible

    expectInvalid(
      validateSsn('123-45-0000', { allowPartial: true }),
      'INVALID_SERIAL'
    );
  });

  test('publicly advertised SSNs are rejected once full value is typed', () => {
    expectValid(validateSsn('078-05-112', { allowPartial: true })); // prefix ok

    expectInvalid(
      validateSsn('078-05-1120', { allowPartial: true }),
      'PUBLICLY_ADVERTISED'
    );
  });

  test('ruleMode=pre2011 rejects area ranges as soon as area is complete', () => {
    expectValid(validateSsn('73', { allowPartial: true, ruleMode: 'pre2011' })); // not complete

    expectInvalid(
      validateSsn('734', { allowPartial: true, ruleMode: 'pre2011' }),
      'INVALID_AREA'
    );
  });
});
