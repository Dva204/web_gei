import 'server-only';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// OWASP scrypt option: N=2^15, r=8, p=3 (~32 MiB); bounded below at request layer.
const PREFIX = 'scrypt$32768$8$3';
const FORMAT = /^scrypt\$32768\$8\$3\$([a-f0-9]{32})\$([a-f0-9]{128})$/;
const DUMMY = `${PREFIX}$${'0'.repeat(32)}$${'0'.repeat(128)}`;
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, Buffer.from(salt, 'hex'), 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error); else resolve(key);
    });
  });
}
export function validPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128
    && Buffer.byteLength(password, 'utf8') <= 512;
}
export async function hashPassword(password: string) {
  if (!validPassword(password)) throw new Error('Mật khẩu cần từ 12 đến 128 ký tự.');
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt);
  return `${PREFIX}$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string | null) {
  const match = encoded?.match(FORMAT);
  const parts = match || DUMMY.match(FORMAT)!;
  const candidate = await derive(password, parts[1]);
  const equal = timingSafeEqual(candidate, Buffer.from(parts[2], 'hex'));
  return Boolean(match && equal);
}
