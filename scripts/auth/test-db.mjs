import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { integrationDatabaseUrl, loadDatabaseEnvironment } from '../db/environment.mjs';
loadDatabaseEnvironment();
let control, schema;
let created = false;
try {
  const url = integrationDatabaseUrl();
  schema = `backend_test_${randomBytes(12).toString('hex')}`;
  control = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  await control.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`); created = true;
  url.searchParams.set('schema', schema);
  const env = { ...process.env, DATABASE_URL: url.toString(), RUN_AUTH_DB_TESTS: '1', AUTH_TRUSTED_ORIGINS: 'https://backend.test' };
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env, stdio: 'pipe', timeout: 60000 });
  execFileSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'tests/backend/auth.integration.test.ts', '--maxWorkers=1'], { env, stdio: 'inherit', timeout: 60000 });
} catch {
  console.error('Auth integration chưa hoàn tất. Kiểm tra DB test riêng và kết quả test; không in credentials.'); process.exitCode = 1;
} finally {
  if (created && /^backend_test_[a-f0-9]{24}$/.test(schema)) {
    try { await control.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`); console.log('Đã dọn schema auth test riêng.'); }
    catch { console.error('Schema test chưa dọn được; cần kiểm tra thủ công.'); process.exitCode = 1; }
  }
  await control?.$disconnect().catch(() => {});
}
