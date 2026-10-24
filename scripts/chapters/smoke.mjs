import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  integrationDatabaseUrl,
  loadDatabaseEnvironment,
} from '../db/environment.mjs';
loadDatabaseEnvironment();
let control,
  schema,
  vault,
  created = false;
try {
  const url = integrationDatabaseUrl(),
    suffix = randomBytes(12).toString('hex');
  schema = 'backend_test_' + suffix;
  vault = 'media_test_' + suffix;
  control = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  await control.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  created = true;
  url.searchParams.set('schema', schema);
  const env = {
    ...process.env,
    DATABASE_URL: url.toString(),
    RUN_CHAPTER_DB_SMOKE: '1',
    MEDIA_TEST_VAULT: vault,
    AUTH_TRUSTED_ORIGINS: 'https://backend.test',
    NODE_ENV: 'test',
  };
  execFileSync(
    process.execPath,
    ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
    { env, stdio: 'pipe', timeout: 60000 },
  );
  execFileSync(
    process.execPath,
    [
      'node_modules/vitest/vitest.mjs',
      'run',
      'tests/backend/chapters.smoke.test.ts',
      '--maxWorkers=1',
    ],
    { env, stdio: 'inherit', timeout: 60000 },
  );
} catch {
  console.error(
    'Smoke B4 chưa hoàn tất. Cần DB test riêng; xem kiểm tra chưa PASS, không in credentials.',
  );
  process.exitCode = 1;
} finally {
  if (created && /^backend_test_[a-f0-9]{24}$/.test(schema)) {
    try {
      await control.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
      console.log('Đã dọn schema B4 test riêng.');
    } catch {
      console.error('Schema B4 test chưa dọn được.');
      process.exitCode = 1;
    }
  }
  await control?.$disconnect().catch(() => {});
  if (vault && /^media_test_[a-f0-9]{24}$/.test(vault)) {
    const root = path.resolve('.data', vault),
      base = path.resolve('.data') + path.sep;
    if (root.startsWith(base)) {
      try {
        // Only remove fixture UUID images in this run's exact vault, never recursive deletion.
        for (const kind of ['comic', 'covers']) {
          const directory = path.join(root, kind);
          for (const file of await readdir(directory).catch(() => [])) {
            if (/^[a-f0-9-]{36}\.webp$/.test(file))
              await unlink(path.join(directory, file));
          }
          await rmdir(directory).catch((error) => {
            if (error.code !== 'ENOENT') throw error;
          });
        }
        await rmdir(root).catch((error) => {
          if (error.code !== 'ENOENT') throw error;
        });
        console.log(
          'Đã dọn kho ảnh fixture riêng; kho ứng dụng không thay đổi.',
        );
      } catch {
        console.error('Kho ảnh fixture chưa dọn được: ' + vault);
        process.exitCode = 1;
      }
    }
  }
}
