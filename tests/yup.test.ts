import { yupSsnTyping, yupSsnSubmit } from '../src/yup';

describe('Yup SSN adapters (new isValidSsn API)', () => {
  describe('yupSsnTyping', () => {
    test('normalizes prefixes while typing (transform)', async () => {
      const schema = yupSsnTyping(); // defaults: requireDashes=true in isValidSsn
      await expect(schema.validate('1')).resolves.toBe('1');
      await expect(schema.validate('12')).resolves.toBe('12');
      await expect(schema.validate('123')).resolves.toBe('123');
      await expect(schema.validate('1234')).resolves.toBe('123-4');
      await expect(schema.validate('12345')).resolves.toBe('123-45');
      await expect(schema.validate('123456')).resolves.toBe('123-45-6');
    });

    test('partial mode only rejects invalid area once 3 digits are present', async () => {
      const schema = yupSsnTyping();

      // With allowPartial=true, 1–2 digits are always potentially valid.
      await expect(schema.validate('9')).resolves.toBe('9');
      await expect(schema.validate('90')).resolves.toBe('90');

      // Once we have 3 digits, area rules apply
      await expect(schema.validate('900')).rejects.toBeTruthy();
      await expect(schema.validate('666')).rejects.toBeTruthy();
      await expect(schema.validate('000')).rejects.toBeTruthy();
    });

    test('typing ignores dash placement and normalizes based on digits extracted', async () => {
      const schema = yupSsnTyping({ requireDashes: true });

      // Dashes are ignored; digits are extracted and then normalized.
      await expect(schema.validate('12-3')).resolves.toBe('123'); // not enough digits to insert '-'
      await expect(schema.validate('123--4')).resolves.toBe('123-4'); // becomes 1234 -> 123-4
      await expect(schema.validate('123-4-5')).resolves.toBe('123-45');
    });

    test('pre2011: rejects area >= 773 as soon as area is complete', async () => {
      const schema = yupSsnTyping({
        ruleMode: 'pre2011',
        requireDashes: false,
      });

      // allow digits-only typing in validation; transform will insert dashes but that's fine
      await expect(schema.validate('772')).resolves.toBe('772');
      await expect(schema.validate('773')).rejects.toBeTruthy();
    });
  });

  describe('yupSsnSubmit', () => {
    test('normalizes full SSN to canonical dashed output by default', async () => {
      const schema = yupSsnSubmit(); // default requireDashes=true, ruleMode post2011
      await expect(schema.validate('123456789')).resolves.toBe('123-45-6789');
      await expect(schema.validate('123-45-6789')).resolves.toBe('123-45-6789');
    });

    test('rejects partial input on submit', async () => {
      const schema = yupSsnSubmit();
      await expect(schema.validate('123-45-6')).rejects.toBeTruthy();
      await expect(schema.validate('123456')).rejects.toBeTruthy();
      await expect(schema.validate('123')).rejects.toBeTruthy();
    });

    test('rejects publicly advertised SSNs', async () => {
      const schema = yupSsnSubmit({ requireDashes: true });
      await expect(schema.validate('078-05-1120')).rejects.toBeTruthy();
      await expect(schema.validate('721-07-4426')).rejects.toBeTruthy();
      await expect(schema.validate('219-09-9999')).rejects.toBeTruthy();
    });

    test('requireDashes=true rejects digits-only if not already dashed (after transform should still pass?)', async () => {
      // Important: yupSsnSubmit transform decides digitsOnly based on requireDashes.
      // If requireDashes=true, transform returns dashed canonical value and then validation checks it.
      // Therefore digits-only input should pass and become dashed.
      const schema = yupSsnSubmit({ requireDashes: true });

      await expect(schema.validate('123456789')).resolves.toBe('123-45-6789');
    });

    test('requireDashes=false: returns digits-only canonical output (per adapter transform)', async () => {
      const schema = yupSsnSubmit({ requireDashes: false });

      await expect(schema.validate('123-45-6789')).resolves.toBe('123456789');
      await expect(schema.validate('123456789')).resolves.toBe('123456789');
    });

    test('pre2011 vs post2011 area rules respected', async () => {
      const pre = yupSsnSubmit({ ruleMode: 'pre2011', requireDashes: true });
      const post = yupSsnSubmit({ ruleMode: 'post2011', requireDashes: true });

      await expect(pre.validate('773-12-3456')).rejects.toBeTruthy();
      await expect(post.validate('773-12-3456')).resolves.toBe('773-12-3456');
    });
  });
});
