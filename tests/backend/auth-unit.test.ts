import { afterEach, describe, expect, it, vi } from 'vitest';
import { credentials } from '@/server/auth/input';
import { assertTrustedOrigin, readAuthJson, withPasswordCapacity } from '@/server/auth/security';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { permissionDecision } from '@/shared/lib/auth/permissions';
import { newSessionToken, tokenDigest, requestToken } from '@/server/auth/session';

afterEach(() => vi.unstubAllEnvs());
describe('auth boundary validation', () => {
  it('normalizes identity and refuses role/status injection', () => {
    expect(credentials({ email: ' Reader@Example.com ', password: 'Strong password!99', name: 'Bạn đọc' }, true).email).toBe('reader@example.com');
    expect(() => credentials({ email: 'x@example.com', name: 'Name', password: 'Strong password!99', role: 'admin' }, true)).toThrow();
    expect(() => credentials({ email: 'x@example.com', password: 'admin123' })).toThrow();
  });
  it('preserves password whitespace and unicode', async () => {
    const password = '  mật khẩu an toàn 🌿  ';
    const encoded = await hashPassword(password);
    expect(encoded).not.toContain(password);
    expect(await verifyPassword(password, encoded)).toBe(true);
    expect(await verifyPassword(password.trim(), encoded)).toBe(false);
    expect(await verifyPassword(password, null)).toBe(false);
  });
  it('uses independent salts', async () => {
    const a = await hashPassword('A secure password!!');
    const b = await hashPassword('A secure password!!');
    expect(a).not.toBe(b);
  });
  it('rejects missing/cross-site origins even with forged Host headers', () => {
    vi.stubEnv('AUTH_TRUSTED_ORIGINS', 'https://reader.example.com');
    for (const origin of ['', 'https://evil.example.com', 'null']) {
      expect(() => assertTrustedOrigin(new Request('http://localhost/api', { headers: { origin, host: 'reader.example.com' } }))).toThrow();
    }
    expect(() => assertTrustedOrigin(new Request('http://localhost/api', { headers: { origin: 'https://reader.example.com' } }))).not.toThrow();
    expect(() => assertTrustedOrigin(new Request('http://localhost/api', { headers: { origin: 'https://reader.example.com', 'sec-fetch-site': 'cross-site' } }))).toThrow();
    for (const origin of ['not-a-url', 'ftp://localhost']) {
      vi.stubEnv('AUTH_TRUSTED_ORIGINS', origin);
      expect(() => assertTrustedOrigin(new Request('http://localhost/api', { headers: { origin } }))).toThrowError(expect.objectContaining({ code: 'FORBIDDEN' }));
    }
  });
  it('fails closed for an unconfigured production origin', () => {
    vi.stubEnv('AUTH_TRUSTED_ORIGINS', ''); vi.stubEnv('NODE_ENV', 'production');
    expect(() => assertTrustedOrigin(new Request('http://localhost', { headers: { origin: 'http://localhost:3000' } }))).toThrow();
  });
  it('bounds streamed bodies and rejects non-object or malformed JSON', async () => {
    for (const body of ['[]', 'null', '{', JSON.stringify({ password: 'x'.repeat(5000) })]) {
      await expect(readAuthJson(new Request('http://localhost', { method: 'POST', headers: { 'content-type': 'application/json' }, body }))).rejects.toThrow();
    }
  });
  it('does not derive cookies from localStorage roles or ambiguous cookie headers', () => {
    const token = newSessionToken();
    expect(token).toHaveLength(43); expect(tokenDigest(token)).toHaveLength(64);
    vi.stubEnv('NODE_ENV', 'development');
    expect(requestToken(new Request('http://localhost', { headers: { cookie: `vuon-session=${token}; vuon-session=${token}` } }))).toBeUndefined();
    expect(requestToken(new Request('http://localhost', { headers: { cookie: 'vuon-admin-session=admin; role=admin' } }))).toBeUndefined();
  });
  it('bounds simultaneous password work and recovers capacity', async () => {
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const a = withPasswordCapacity(() => pending), b = withPasswordCapacity(() => pending);
    await expect(withPasswordCapacity(async () => true)).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
    release(); await Promise.all([a, b]);
    await expect(withPasswordCapacity(async () => true)).resolves.toBe(true);
  });
});
describe('server permission policy', () => {
  it('fails closed for unknown roles/actions and member access', () => {
    expect(permissionDecision('member', 'dashboard.view')).toBe('deny');
    expect(permissionDecision('admin', 'unknown')).toBe('deny');
    expect(permissionDecision('unexpected' as 'member', 'backup.manage')).toBe('deny');
  });
  it('requires assignment without granting author/beta publishing rights', () => {
    expect(permissionDecision('author', 'chapters.manage')).toBe('author');
    expect(permissionDecision('author', 'chapters.publish')).toBe('deny');
    expect(permissionDecision('beta', 'chapters.beta')).toBe('beta');
    expect(permissionDecision('beta', 'chapters.manage')).toBe('deny');
    expect(permissionDecision('mod', 'users.roles')).toBe('deny');
  });
});
