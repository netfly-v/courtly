import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './environment.js';

const valid = {
  DATABASE_URL: 'postgresql://courtly:courtly@localhost:5434/courtly',
  JWT_SECRET: 'a'.repeat(32),
};

describe('validateEnvironment', () => {
  it('uses defaults for optional values', () => {
    expect(validateEnvironment(valid)).toMatchObject({ PORT: 4000, COOKIE_SECURE: 'false' });
  });

  it.each([
    [{ JWT_SECRET: 'short' }, 'JWT_SECRET must be at least 32 characters long'],
    [{ COOKIE_SECURE: 'TRUE' }, "COOKIE_SECURE must be 'true' or 'false'"],
  ])('fails with a clear message for %o', (override, message) => {
    expect(() => validateEnvironment({ ...valid, ...override })).toThrow(
      `Invalid environment: ${message}`
    );
  });
});
