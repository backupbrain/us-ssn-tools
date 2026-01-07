import * as yup from 'yup';
import { yupSsnTyping, yupSsnSubmit } from '../src/yup';

describe('Yup SSN adapters', () => {
  describe('yupSsnTyping', () => {
    test('normalizes on typing (digits-only -> dashed prefix)', async () => {
      const schema = yupSsnTyping({ allowNoDashes: true });

      await expect(schema.validate('1234')).resolves.toBe('123-4');
      await expect(schema.validate('123456')).resolves.toBe('123-45-6');
    });

    test('rejects impossible prefixes early', async () => {
      const schema = yupSsnTyping();
      await expect(schema.validate('9')).rejects.toBeTruthy();
    });
  });

  describe('yupSsnSubmit', () => {
    test('normalizes full input to ###-##-####', async () => {
      const schema = yupSsnSubmit({ allowNoDashes: true });

      await expect(schema.validate('123456789')).resolves.toBe('123-45-6789');
      await expect(schema.validate('123-45-6789')).resolves.toBe('123-45-6789');
    });

    test('rejects partial input', async () => {
      const schema = yupSsnSubmit();
      await expect(schema.validate('123-45-6')).rejects.toBeTruthy();
      await expect(schema.validate('123456')).rejects.toBeTruthy();
    });

    test('rejects publicly advertised SSN', async () => {
      const schema = yupSsnSubmit();
      await expect(schema.validate('078-05-1120')).rejects.toBeTruthy();
    });

    test('ruleMode=pre2011 rejects 773 area', async () => {
      const schema = yupSsnSubmit({ ruleMode: 'pre2011' });
      await expect(schema.validate('773-12-3456')).rejects.toBeTruthy();
    });

    test('ruleMode=post2011 allows 773 area', async () => {
      const schema = yupSsnSubmit({ ruleMode: 'post2011' });
      await expect(schema.validate('773-12-3456')).resolves.toBe('773-12-3456');
    });
  });

  test('works inside an object schema and returns normalized output', async () => {
    const Form = yup.object({
      ssn: yupSsnSubmit({ allowNoDashes: true }).required(),
    });

    const out = await Form.validate({ ssn: '123456789' });
    expect(out.ssn).toBe('123-45-6789');
  });
});
