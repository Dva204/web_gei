import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { PrismaClient } from '@prisma/client';
import { integrationDatabaseUrl, loadDatabaseEnvironment } from '../db/environment.mjs';

// Requires a successful npm run build. Never starts against the application database.
loadDatabaseEnvironment();
let control, db, child, schema, created = false;
let checks = 0;
function check(value, label) {
  if (!value) throw new Error(label);
  checks++; console.log(`PASS ${label}`);
}
try {
  const url = integrationDatabaseUrl();
  schema = `backend_test_${randomBytes(12).toString('hex')}`;
  control = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  await control.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`); created = true;
  url.searchParams.set('schema', schema);
  const listener = createServer();
  listener.listen(0, '127.0.0.1'); await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  const origin = `http://127.0.0.1:${port}`;
  const env = { ...process.env, DATABASE_URL: url.toString(), AUTH_TRUSTED_ORIGINS: origin, NODE_ENV: 'production' };
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env, stdio: 'pipe', timeout: 60000 });
  db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], { env, stdio: 'ignore', windowsHide: true });
  let startError; child.on('error', error => { startError = error; });
  const request = (path, init = {}) => fetch(origin + path, { ...init, redirect: 'manual', signal: AbortSignal.timeout(10000) });
  let ready = false;
  for (let index = 0; index < 150; index++) {
    if (startError || child.exitCode !== null) throw new Error('Production server failed');
    try { if ((await request('/api/health/db')).status === 200) { ready = true; break; } } catch { /* Wait for this owned process only. */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  check(ready, 'production server uses isolated PostgreSQL');
  check((await (await request('/api/auth/me')).json()).data.user === null, 'guest session is null');
  check((await request('/api/admin/session')).status === 401, 'guest admin API is 401');
  async function redirected(path, destination, cookie = '') {
    const response = await request(path, { headers: { cookie } });
    const location = response.headers.get('location');
    const body = await response.text();
    // Next can signal redirects in streamed HTML after response headers have been sent.
    return location === destination || (response.status === 200 && body.includes(`NEXT_REDIRECT;replace;${destination};`));
  }
  check(await redirected('/admin', '/admin/dang-nhap'), 'guest admin page redirects before business data');
  check(await redirected('/admin/quang-cao', '/admin/dang-nhap'), 'direct private module URL is guarded');
  check((await request('/api/admin/session', { headers: { cookie: 'vuon-admin-session=admin; role=admin' } })).status === 401, 'legacy demo role cannot authenticate');
  const loginHtml = await (await request('/admin/dang-nhap')).text();
  check(!loginHtml.includes('123456') && !loginHtml.includes('admin@vuon.local'), 'production login contains no demo credentials or OTP');
  const post = (path, body, cookie = '', requestOrigin = origin) => request(path, {
    method: 'POST', headers: { origin: requestOrigin, cookie, 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const password = 'Isolated-http-test-password!99';
  const registration = await post('/api/auth/register', { email: 'http@backend.test', name: 'HTTP Fixture', password });
  check(registration.status === 201, 'register through production HTTP');
  const setCookie = registration.headers.get('set-cookie') || '', cookie = setCookie.split(';')[0];
  check(setCookie.startsWith('__Host-vuon-session=') && setCookie.includes('HttpOnly') && setCookie.includes('Secure') && /SameSite=lax/i.test(setCookie), 'production Host cookie is HttpOnly/Secure/SameSite');
  const member = (await registration.json()).data.user;
  check(member.role === 'member', 'registration cannot grant staff role');
  check((await request('/api/admin/session', { headers: { cookie } })).status === 403, 'authenticated member admin API is 403');
  check(await redirected('/admin', '/admin/403', cookie), 'member page redirects to forbidden, not admin');
  // This is a fixture promotion only in the random test schema, never an exposed API.
  await db.user.update({ where: { id: member.id }, data: { role: 'admin' } });
  check((await request('/api/admin/session', { headers: { cookie } })).status === 200, 'server reads current DB role');
  const staffPage = await request('/admin/quang-cao', { headers: { cookie } });
  check(staffPage.status === 200 && !(await staffPage.text()).includes('NEXT_REDIRECT;'), 'authenticated admin module renders');
  check((await post('/api/auth/logout', {}, cookie, 'https://evil.test')).status === 403, 'production HTTP blocks cross-origin logout');
  check((await post('/api/auth/logout', {}, cookie)).status === 200, 'production logout succeeds');
  check((await request('/api/admin/session', { headers: { cookie } })).status === 401, 'revoked cookie cannot access staff API');
  console.log(`${checks} production HTTP checks passed.`);
} catch {
  console.error('HTTP smoke chưa hoàn tất. Cần build thành công, DB test riêng và kiểm tra cuối cùng chưa PASS; không in credentials.');
  process.exitCode = 1;
} finally {
  if (child?.pid && child.exitCode === null) {
    const exited = once(child, 'exit').catch(() => {});
    child.kill(); await exited;
  }
  await db?.$disconnect().catch(() => {});
  if (created && /^backend_test_[a-f0-9]{24}$/.test(schema)) {
    try { await control.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`); console.log('Đã dừng server và dọn đúng schema HTTP test.'); }
    catch { console.error('Schema HTTP test chưa dọn được; cần kiểm tra thủ công.'); process.exitCode = 1; }
  }
  await control?.$disconnect().catch(() => {});
}
