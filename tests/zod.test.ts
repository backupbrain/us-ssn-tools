import { zodSsnTyping, zodSsnSubmit } from '../src/zod';
import { z } from 'zod';

describe('Zod SSN adapters (new isValidSsn + normalizeSsnInput API)', () => {
  describe('zodSsnTyping', () => {
    test('normalizes prefixes while typing (transform output)', () => {
      const schema = zodSsnTyping();

      expect(schema.parse('1')).toBe('1');
      expect(schema.parse('12')).toBe('12');
      expect(schema.parse('123')).toBe('123');
      expect(schema.parse('1234')).toBe('123-4');
      expect(schema.parse('12345')).toBe('123-45');
      expect(schema.parse('123456')).toBe('123-45-6');
    });

    test('extracts digits from mixed input and normalizes', () => {
      const schema = zodSsnTyping();

      expect(schema.parse('SSN: 12a3-4')).toBe('123-4');
      expect(schema.parse('123😀45😅6789')).toBe('123-45-6789');
      expect(schema.parse('123 45 6789')).toBe('123-45-6789');
    });

    test('does not reject 1–2 digit prefixes even if they start with 9 (area not complete yet)', () => {
      const schema = zodSsnTyping();

      expect(schema.parse('9')).toBe('9');
      expect(schema.parse('90')).toBe('90');
    });

    test('rejects invalid area once area is complete (3 digits)', () => {
      const schema = zodSsnTyping();

      expect(() => schema.parse('900')).toThrow();
      expect(() => schema.parse('666')).toThrow();
      expect(() => schema.parse('000')).toThrow();
    });

    test('pre2011: rejects area >= 773 once area is complete', () => {
      const schema = zodSsnTyping({
        ruleMode: 'pre2011',
        requireDashes: false,
      });

      expect(schema.parse('772')).toBe('772');
      expect(() => schema.parse('773')).toThrow();
    });

    test('weird dash placement is tolerated because normalization extracts digits first', () => {
      const schema = zodSsnTyping({ requireDashes: true });

      // normalization extracts digits and formats; then isValidSsn checks normalized
      expect(schema.parse('12-3')).toBe('123');
      expect(schema.parse('123--4')).toBe('123-4');
      expect(schema.parse('123-4-5')).toBe('123-45');
    });
  });

  describe('zodSsnSubmit', () => {
    test('normalizes full SSN to canonical dashed output by default', () => {
      const schema = zodSsnSubmit();

      expect(schema.parse('123456789')).toBe('123-45-6789');
      expect(schema.parse('123-45-6789')).toBe('123-45-6789');
    });

    test('rejects partial input on submit', () => {
      const schema = zodSsnSubmit();

      expect(() => schema.parse('123')).toThrow();
      expect(() => schema.parse('12345')).toThrow();
      expect(() => schema.parse('123-45-6')).toThrow();
    });

    test('rejects publicly advertised SSNs', () => {
      const schema = zodSsnSubmit();

      expect(() => schema.parse('078-05-1120')).toThrow();
      expect(() => schema.parse('721-07-4426')).toThrow();
      expect(() => schema.parse('219-09-9999')).toThrow();
    });

    test('requireDashes=false returns digits-only canonical output', () => {
      const schema = zodSsnSubmit({ requireDashes: false });

      expect(schema.parse('123-45-6789')).toBe('123456789');
      expect(schema.parse('123456789')).toBe('123456789');
    });

    test('pre2011 vs post2011 area rules respected', () => {
      const pre = zodSsnSubmit({ ruleMode: 'pre2011', requireDashes: true });
      const post = zodSsnSubmit({ ruleMode: 'post2011', requireDashes: true });

      expect(() => pre.parse('773-12-3456')).toThrow();
      expect(post.parse('773-12-3456')).toBe('773-12-3456');
    });

    test('submit schema works inside object schemas', () => {
      const FormSchema = z.object({ ssn: zodSsnSubmit() });
      const out = FormSchema.parse({ ssn: '123456789' });
      expect(out.ssn).toBe('123-45-6789');
    });
  });
});
