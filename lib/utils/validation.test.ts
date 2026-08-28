import { describe, it, expect } from 'vitest';
import {
  requiredString,
  optionalString,
  email,
  optionalEmail,
  phone,
  numberField,
  idField,
  password,
  url,
  booleanField,
  withPasswordConfirmation,
  flattenFieldErrors,
  normalizeServerErrors,
} from './validation';
import { z } from 'zod';

describe('requiredString', () => {
  it('rejects empty/whitespace', () => {
    expect(requiredString('Name').safeParse('').success).toBe(false);
    expect(requiredString('Name').safeParse('   ').success).toBe(false);
  });
  it('accepts trimmed non-empty', () => {
    const r = requiredString('Name').safeParse('  Acme  ');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe('Acme');
  });
  it('enforces min length', () => {
    const r = requiredString('Code', { min: 3 }).safeParse('ab');
    expect(r.success).toBe(false);
  });
  it('enforces max length', () => {
    const r = requiredString('Code', { max: 3 }).safeParse('abcd');
    expect(r.success).toBe(false);
  });
});

describe('optionalString', () => {
  it('converts empty string to undefined', () => {
    const r = optionalString().safeParse('');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBeUndefined();
  });
  it('passes through real values', () => {
    const r = optionalString().safeParse('hello');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe('hello');
  });
});

describe('email', () => {
  it('rejects missing/invalid', () => {
    expect(email().safeParse('').success).toBe(false);
    expect(email().safeParse('not-an-email').success).toBe(false);
  });
  it('accepts valid', () => {
    expect(email().safeParse('user@example.com').success).toBe(true);
  });
});

describe('optionalEmail', () => {
  it('allows empty', () => {
    const r = optionalEmail().safeParse('');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBeUndefined();
  });
  it('rejects invalid but present', () => {
    expect(optionalEmail().safeParse('nope').success).toBe(false);
  });
});

describe('phone', () => {
  it('accepts BD formats', () => {
    expect(phone().safeParse('01712345678').success).toBe(true);
    expect(phone().safeParse('+8801712345678').success).toBe(true);
    expect(phone().safeParse('8801712345678').success).toBe(true);
  });
  it('rejects invalid', () => {
    expect(phone().safeParse('12345').success).toBe(false);
    expect(phone().safeParse('017123').success).toBe(false);
  });
  it('optional phone allows empty', () => {
    const r = phone('Phone', false).safeParse('');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBeUndefined();
  });
});

describe('numberField', () => {
  it('required + min', () => {
    expect(numberField({ label: 'Users', required: true, min: 1 }).safeParse('').success).toBe(false);
    expect(numberField({ label: 'Users', required: true, min: 1 }).safeParse('0').success).toBe(false);
    expect(numberField({ label: 'Users', required: true, min: 1 }).safeParse('5').success).toBe(true);
  });
  it('integer constraint', () => {
    expect(numberField({ label: 'Qty', integer: true }).safeParse('2.5').success).toBe(false);
    expect(numberField({ label: 'Qty', integer: true }).safeParse('2').success).toBe(true);
  });
  it('optional empty -> undefined', () => {
    const r = numberField({ label: 'Max' }).safeParse('');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBeUndefined();
  });
  it('max bound', () => {
    expect(numberField({ label: 'Max', max: 10 }).safeParse('11').success).toBe(false);
  });
});

describe('idField', () => {
  it('rejects empty / zero / non-numeric', () => {
    expect(idField('Business type').safeParse('').success).toBe(false);
    expect(idField('Business type').safeParse(0).success).toBe(false);
    expect(idField('Business type').safeParse('abc').success).toBe(false);
  });
  it('accepts positive id', () => {
    expect(idField('Business type').safeParse(3).success).toBe(true);
  });
});

describe('password', () => {
  it('enforces min length', () => {
    expect(password().safeParse('short').success).toBe(false);
    expect(password().safeParse('longenough').success).toBe(true);
  });
});

describe('url', () => {
  it('optional empty allowed', () => {
    const r = url().safeParse('');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBeUndefined();
  });
  it('rejects invalid url', () => {
    expect(url().safeParse('notaurl').success).toBe(false);
  });
  it('accepts valid url', () => {
    expect(url().safeParse('https://example.com').success).toBe(true);
  });
});

describe('booleanField', () => {
  it('defaults false', () => {
    const r = booleanField.safeParse(undefined);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe(false);
  });
});

describe('withPasswordConfirmation', () => {
  const schema = withPasswordConfirmation(
    z.object({ password: z.string(), password_confirmation: z.string() }),
    'password',
    'password_confirmation',
  );
  it('fails when mismatched', () => {
    const r = schema.safeParse({ password: 'abcdefgh', password_confirmation: 'different' });
    expect(r.success).toBe(false);
  });
  it('passes when matched', () => {
    const r = schema.safeParse({ password: 'abcdefgh', password_confirmation: 'abcdefgh' });
    expect(r.success).toBe(true);
  });
});

describe('flattenFieldErrors', () => {
  it('picks first message per path', () => {
    const out = flattenFieldErrors([
      { path: ['email'], message: 'bad email', code: 'custom' },
      { path: ['email'], message: 'second', code: 'custom' },
      { path: ['phone'], message: 'bad phone', code: 'custom' },
    ] as unknown as z.core.$ZodIssue[]);
    expect(out).toEqual({ email: 'bad email', phone: 'bad phone' });
  });
});

describe('normalizeServerErrors', () => {
  it('handles string[] and string', () => {
    expect(normalizeServerErrors({ email: ['bad'], phone: 'no' })).toEqual({ email: 'bad', phone: 'no' });
  });
  it('returns empty for undefined', () => {
    expect(normalizeServerErrors(undefined)).toEqual({});
  });
});
