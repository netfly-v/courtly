import { randomBytes, scrypt, type ScryptOptions, timingSafeEqual } from 'node:crypto';

// One of the OWASP scrypt settings; uses 16 MiB, under Node's default 32 MiB limit.
const PARAMS = { N: 2 ** 14, r: 8, p: 5 };
const KEY_LENGTH = 64;

const deriveKey = (password: string, salt: Buffer, options: ScryptOptions, keyLength: number) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key);
    });
  });

// The parameters are stored with the hash, so they can change later without breaking old passwords.
export const hashPassword = async (password: string) => {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, PARAMS, KEY_LENGTH);
  const { N, r, p } = PARAMS;
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${key.toString('base64')}`;
};

export const verifyPassword = async (password: string, stored: string) => {
  const [algorithm, N, r, p, salt, hash] = stored.split('$');
  if (algorithm !== 'scrypt' || !N || !r || !p || !salt || !hash) {
    return false;
  }
  const expected = Buffer.from(hash, 'base64');
  const options = { N: Number(N), r: Number(r), p: Number(p) };
  const actual = await deriveKey(password, Buffer.from(salt, 'base64'), options, expected.length);
  // Constant-time compare, so response time doesn't leak how many bytes matched.
  return timingSafeEqual(actual, expected);
};
