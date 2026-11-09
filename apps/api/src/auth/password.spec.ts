import { describe, expect, it } from 'vitest';
import { verifyPassword } from './password.js';

describe('verifyPassword', () => {
  it('rejects any password when the stored hash decodes to no bytes', async () => {
    expect(await verifyPassword('any-password', 'scrypt$16384$8$5$c2FsdA==$!')).toBe(false);
  });
});
