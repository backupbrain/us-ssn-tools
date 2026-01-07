import { z } from 'zod';
import { zodSsnTyping, zodSsnSubmit } from '../src/zod';

describe('Zod SSN adapters', () => {
  describe('zodSsnTyping', () => {
    test('normalizes on typing (digits-only -> dashed prefix)', () => {
      const schema = zodSsnTyping({ allowNoDashes: true, ruleMode: 'both' });

      const out = schema.parse('1234');
      expect(out).toBe('123-4');

      const out2 = schema.parse('123456');
      expect(out2).toBe('123-45-6');
    });

    test('accepts dashed partial input and returns normalized prefix', () => {
      const schema = zodSsnTyping();
      expect(schema.parse('123-4')).toBe('123-4');
      expect(schema.parse('123-45-6')).toBe('123-45-6');
    });

    test('rejects impossible prefixes early (area starting with 9)', () => {
      const schema = zodSsnTyping();
      expect(() => schema.parse('9')).toThrow();
    });

    test('provides ssnError in params (custom issue)', () => {
      const schema = zodSsnTyping();

      const res = schema.safeParse('9');
      expect(res.success).toBe(false);
      if (res.success) return;

      const issue = res.error.issues[0];
      expect(issue.code).toBe('custom');
      // params are optional in zod types; check existence defensively
      if (issue.code === 'custom') {
        expect(issue.params?.ssnError).toBe('INVALID_AREA');
      } else {
        // should not happen because of the assertion above
        throw new Error('Expected a custom issue with params');
      }
    });
  });

  describe('zodSsnSubmit', () => {
    test('normalizes full input to ###-##-####', () => {
      const schema = zodSsnSubmit({ allowNoDashes: true });

      expect(schema.parse('123456789')).toBe('123-45-6789');
      expect(schema.parse('123-45-6789')).toBe('123-45-6789');
    });

    test('rejects partial input', () => {
      const schema = zodSsnSubmit();
      expect(() => schema.parse('123-45-6')).toThrow();
      expect(() => schema.parse('123456')).toThrow();
    });

    test('rejects publicly advertised SSN', () => {
      const schema = zodSsnSubmit();
      expect(() => schema.parse('078-05-1120')).toThrow();
    });

    test('ruleMode=pre2011 rejects 773 area', () => {
      const schema = zodSsnSubmit({ ruleMode: 'pre2011' });
      expect(() => schema.parse('773-12-3456')).toThrow();
    });

    test('ruleMode=post2011 allows 773 area', () => {
      const schema = zodSsnSubmit({ ruleMode: 'post2011' });
      expect(schema.parse('773-12-3456')).toBe('773-12-3456');
    });
  });

  test('works inside an object schema', () => {
    const Form = z.object({ ssn: zodSsnSubmit() });

    const out = Form.parse({ ssn: '123456789' });
    expect(out.ssn).toBe('123-45-6789');
  });
});
