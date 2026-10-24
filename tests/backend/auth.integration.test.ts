import { execFileSync } from 'node:child_process';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/server/db/prisma';
import { POST as register } from '@/app/api/auth/register/route';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as me } from '@/app/api/auth/me/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { POST as logoutAll } from '@/app/api/auth/logout-all/route';
import { GET as admin } from '@/app/api/admin/session/route';
import { PATCH as sanction } from '@/app/api/admin/users/[id]/status/route';
import { hashPassword } from '@/server/auth/password';
import { consumeAuthLimit } from '@/server/auth/rateLimit';
import { issueSession } from '@/server/auth/session';
import { requirePermission } from '@/server/auth/authorization';
import type { SessionUser, UserRole } from '@/shared/lib/auth/types';

const password = 'Isolated-test-password!9988'; // Only in fresh random-schema fixtures, never app defaults.
let passwordHash: string;
const req = (body: unknown = {}, cookie = '', origin = 'https://backend.test', method = 'POST') => new Request('http://localhost/api/test', {
  method, headers: { origin, cookie, 'content-type': 'application/json' }, ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
});
const cookieOf = (response: Response) => response.headers.get('set-cookie')!.split(';')[0];
async function fixture(role: UserRole = 'member', email = role + '@backend.test') {
  const user = await prisma.user.create({ data: { email, name: 'Fixture', role, passwordHash } });
  const response = await login(req({ email, password }));
  expect(response.status).toBe(200);
  return { user, cookie: cookieOf(response), dto: (await response.json()).data.user as SessionUser };
}
describe.skipIf(process.env.RUN_AUTH_DB_TESTS !== '1')('auth against isolated PostgreSQL', () => {
  beforeAll(async () => { passwordHash = await hashPassword(password); });
  beforeEach(async () => {
    // Runner restricts DATABASE_URL to the fresh random test schema before starting Vitest.
    expect(new URL(process.env.DATABASE_URL!).searchParams.get('schema')).toMatch(/^backend_test_[a-f0-9]{24}$/);
    await prisma.auditLog.deleteMany(); await prisma.session.deleteMany();
    await prisma.story.deleteMany(); await prisma.user.deleteMany(); await prisma.authRateLimit.deleteMany();
  });
  afterAll(async () => { await prisma.$disconnect(); });
  it('returns 401 for guests and 200/null for the public session view', async () => {
    expect((await admin(req({}, '', '', 'GET'))).status).toBe(401);
    expect((await (await me(req({}, '', '', 'GET'))).json()).data.user).toBeNull();
  });
  it('rejects role injection then creates only a member with hashed credentials', async () => {
    expect((await register(req({ email: 'reader@backend.test', name: 'Reader', password, role: 'admin' }))).status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
    const response = await register(req({ email: ' Reader@backend.test ', name: 'Reader', password }));
    expect(response.status).toBe(201);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('Secure');
    expect(response.headers.get('set-cookie')).toContain('SameSite=lax');
    const body = await response.json();
    expect(body.data.user.role).toBe('member');
    expect(JSON.stringify(body)).not.toContain('passwordHash');
    expect(JSON.stringify(body)).not.toContain('token');
    const stored = await prisma.user.findFirstOrThrow();
    expect(stored.passwordHash).not.toContain(password);
    const token = cookieOf(response).split('=')[1];
    expect((await prisma.session.findFirstOrThrow()).tokenHash).not.toBe(token);
    expect((await (await me(req({}, cookieOf(response), '', 'GET'))).json()).data.user.id).toBe(stored.id);
  });
  it('does not overwrite an existing account on duplicate registration', async () => {
    await fixture();
    const response = await register(req({ email: 'member@backend.test', name: 'Overwrite', password: 'Different-password!99' }));
    expect(response.status).toBe(409);
    expect((await prisma.user.findFirstOrThrow()).passwordHash).toBe(passwordHash);
    expect(await prisma.user.count()).toBe(1);
  });
  it('uses the same login failure for wrong passwords and unknown users', async () => {
    await fixture();
    const a = await login(req({ email: 'member@backend.test', password: 'Wrong-password!9988' }));
    const b = await login(req({ email: 'unknown@backend.test', password }));
    expect(a.status).toBe(401); expect(b.status).toBe(401);
    expect((await a.json()).error).toEqual((await b.json()).error);
  });
  it('refuses member admin access and old demo cookies', async () => {
    const f = await fixture();
    expect((await admin(req({}, f.cookie, '', 'GET'))).status).toBe(403);
    expect((await login(req({ email: f.user.email, password, audience: 'admin' }))).status).toBe(403);
    expect((await admin(req({}, 'vuon-admin-session=admin; role=admin', '', 'GET'))).status).toBe(401);
  });
  it('rotates session tokens on login and revokes the previous token', async () => {
    const f = await fixture();
    const response = await login(req({ email: f.user.email, password }, f.cookie));
    expect(response.status).toBe(200); expect(cookieOf(response)).not.toBe(f.cookie);
    expect((await (await me(req({}, f.cookie, '', 'GET'))).json()).data.user).toBeNull();
    expect(await prisma.session.count()).toBe(1);
  });
  it('blocks CSRF before logout and leaves the existing session valid', async () => {
    const f = await fixture();
    for (const origin of ['', 'null', 'https://evil.test']) {
      expect((await logout(req({}, f.cookie, origin))).status).toBe(403);
    }
    expect((await (await me(req({}, f.cookie, '', 'GET'))).json()).data.user.id).toBe(f.user.id);
  });
  it('revokes the current session on logout', async () => {
    const f = await fixture(); const response = await logout(req({}, f.cookie));
    expect(response.status).toBe(200); expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(await prisma.session.count()).toBe(0);
  });
  it('revokes only the current user sessions on logout-all', async () => {
    const a = await fixture('member', 'a@backend.test'), b = await fixture('member', 'b@backend.test');
    const extra = await login(req({ email: a.user.email, password }));
    expect((await logoutAll(req({ userId: b.user.id }, a.cookie))).status).toBe(200);
    expect((await (await me(req({}, cookieOf(extra), '', 'GET'))).json()).data.user).toBeNull();
    expect((await (await me(req({}, b.cookie, '', 'GET'))).json()).data.user.id).toBe(b.user.id);
  });
  it('checks current DB role, suspension and expiry on every request', async () => {
    const f = await fixture();
    await prisma.user.update({ where: { id: f.user.id }, data: { role: 'admin' } });
    expect((await admin(req({}, f.cookie, '', 'GET'))).status).toBe(200);
    await prisma.user.update({ where: { id: f.user.id }, data: { status: 'suspended' } });
    expect((await admin(req({}, f.cookie, '', 'GET'))).status).toBe(401);
    await prisma.user.update({ where: { id: f.user.id }, data: { status: 'active' } });
    await prisma.session.updateMany({ data: { createdAt: new Date(Date.now() - 86400000), expiresAt: new Date(Date.now() - 3600000) } });
    expect((await admin(req({}, f.cookie, '', 'GET'))).status).toBe(401);
  });
  it('atomically enforces limits under concurrent requests', async () => {
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => consumeAuthLimit('concurrent-test', 'identity', 3)));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(3);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(5);
    expect((await prisma.authRateLimit.findFirstOrThrow()).hits).toBe(4);
  });
  it('returns 429 and Retry-After after five email login attempts', async () => {
    for (let index = 0; index < 5; index++) expect((await login(req({ email: 'unknown@backend.test', password }))).status).toBe(401);
    const response = await login(req({ email: 'unknown@backend.test', password }));
    expect(response.status).toBe(429); expect(response.headers.get('retry-after')).toBe('900');
  });
  it('checks author/beta assignments without granting publishing', async () => {
    const author = await fixture('author'), beta = await fixture('beta');
    const story = await prisma.story.create({ data: { slug: 'assigned-test', title: 'Assigned', synopsis: '' } });
    await prisma.storyAssignment.createMany({ data: [
      { storyId: story.id, userId: author.user.id, kind: 'author' }, { storyId: story.id, userId: beta.user.id, kind: 'beta' },
    ] });
    await expect(requirePermission(author.dto, 'chapters.manage', story.id)).resolves.toBeUndefined();
    await expect(requirePermission(author.dto, 'chapters.manage', 'other')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(requirePermission(author.dto, 'chapters.publish', story.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(requirePermission(beta.dto, 'chapters.beta', story.id)).resolves.toBeUndefined();
    await expect(requirePermission(beta.dto, 'chapters.manage', story.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('keeps the ten-session cap under concurrent creation', async () => {
    const f = await fixture();
    // Wait for every transaction before assertions/next fixture cleanup, even on failures.
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => prisma.$transaction(tx => issueSession(tx, f.user.id), { maxWait: 15000, timeout: 15000 })));
    expect(results.filter(result => result.status === 'rejected')).toEqual([]);
    expect(await prisma.session.count()).toBe(10);
  }, 20000);
  it('moderator suspends members, revokes sessions and cannot sanction staff', async () => {
    const mod = await fixture('mod'), member = await fixture(), editor = await fixture('editor');
    const response = await sanction(req({ status: 'suspended', reason: 'Kiểm thử khóa tài khoản' }, mod.cookie, 'https://backend.test', 'PATCH'), { params: Promise.resolve({ id: member.user.id }) });
    expect(response.status).toBe(200);
    expect((await (await me(req({}, member.cookie, '', 'GET'))).json()).data.user).toBeNull();
    expect(await prisma.session.count({ where: { userId: member.user.id } })).toBe(0);
    expect((await sanction(req({ status: 'suspended', reason: 'Không đủ quyền cho staff' }, mod.cookie, 'https://backend.test', 'PATCH'), { params: Promise.resolve({ id: editor.user.id }) })).status).toBe(403);
    expect(await prisma.auditLog.count({ where: { action: 'users.status', objectId: member.user.id } })).toBe(1);
  });
  it('rejects self-sanctions and moderator disabling, allows admin sanction of staff', async () => {
    const adminUser = await fixture('admin'), mod = await fixture('mod'), member = await fixture();
    const patch = (id: string, cookie: string, status = 'disabled') => sanction(req({ status, reason: 'Kiểm thử giới hạn quyền' }, cookie, 'https://backend.test', 'PATCH'), { params: Promise.resolve({ id }) });
    expect((await patch(adminUser.user.id, adminUser.cookie)).status).toBe(403);
    expect((await patch(member.user.id, mod.cookie)).status).toBe(403);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: member.user.id } })).status).toBe('active');
    expect((await patch(mod.user.id, adminUser.cookie)).status).toBe(200);
    expect((await admin(req({}, mod.cookie, '', 'GET'))).status).toBe(401);
  });
  it('cleanup removes expired auth records but keeps active sessions, users and audit', async () => {
    const f = await fixture();
    await prisma.session.create({ data: { userId: f.user.id, tokenHash: 'a'.repeat(64), createdAt: new Date(Date.now() - 86400000), expiresAt: new Date(Date.now() - 3600000) } });
    await consumeAuthLimit('keep-counter', 'identity', 5);
    await prisma.authRateLimit.create({ data: { key: 'expired-counter', windowStart: new Date(Date.now() - 86400000), expiresAt: new Date(Date.now() - 3600000) } });
    const auditCount = await prisma.auditLog.count();
    execFileSync(process.execPath, ['scripts/auth/cleanup.mjs'], { env: process.env, stdio: 'pipe', timeout: 15000 });
    expect(await prisma.session.count()).toBe(1);
    expect(await prisma.authRateLimit.findUnique({ where: { key: 'expired-counter' } })).toBeNull();
    expect(await prisma.authRateLimit.count()).toBeGreaterThan(0);
    expect(await prisma.auditLog.count()).toBe(auditCount);
    expect(await prisma.user.count()).toBe(1);
  });
  it('bootstrap creates a single admin and refuses a second or member promotion', async () => {
    const run = (email: string) => execFileSync(process.execPath, ['--conditions=react-server', 'scripts/auth/bootstrap.mjs'], {
      env: { ...process.env, BOOTSTRAP_ADMIN_EMAIL: email, BOOTSTRAP_ADMIN_PASSWORD: password }, stdio: 'pipe', timeout: 15000,
    });
    await prisma.user.create({ data: { email: 'existing@backend.test', name: 'Existing', passwordHash } });
    expect(() => run('existing@backend.test')).toThrow();
    expect((await prisma.user.findFirstOrThrow()).role).toBe('member');
    run('first@backend.test');
    expect(await prisma.user.count({ where: { role: 'admin' } })).toBe(1);
    expect(() => run('second@backend.test')).toThrow();
    expect(await prisma.user.count({ where: { role: 'admin' } })).toBe(1);
  }, 20000);
});
