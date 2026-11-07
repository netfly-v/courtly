import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './environment.js';

const valid = {
  DATABASE_URL: 'postgresql://courtly:courtly@localhost:5434/courtly',
  JWT_SECRET: 'a'.repeat(32),
};

describe('validateEnvironment', () => {
  it.each([
    ['true', true],
    ['false', false],
  ])('reads COOKIE_SECURE=%s as %s', (text, expected) => {
    expect(validateEnvironment({ ...valid, COOKIE_SECURE: text }).COOKIE_SECURE).toBe(expected);
  });

  it('uses defaults for optional values', () => {
    expect(validateEnvironment(valid)).toMatchObject({ PORT: 4000, COOKIE_SECURE: false });
  });

  it('fails with a clear message', () => {
    expect(() => validateEnvironment({ ...valid, JWT_SECRET: 'short' })).toThrow(
      'Invalid environment: JWT_SECRET must be at least 32 characters long'
    );
  });
});
