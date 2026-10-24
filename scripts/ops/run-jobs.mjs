import { mkdir, open, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { run } from './common.mjs';

const lockDirectory = path.join(process.cwd(), '.data', 'jobs');
const lockFile = path.join(lockDirectory, 'operations.lock');
const staleAfterMs = 2 * 60 * 60 * 1000;
let handle;
let ownsLock = false;

try {
  await mkdir(lockDirectory, { recursive: true });
  try {
    handle = await open(lockFile, 'wx');
    ownsLock = true;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const value = JSON.parse(await readFile(lockFile, 'utf8'));
    const startedAt = Date.parse(value.startedAt);
    if (!Number.isFinite(startedAt) || Date.now() - startedAt <= staleAfterMs) {
      console.log('Job vận hành khác đang chạy; bỏ qua lượt này.');
      process.exit(0);
    }
    await rm(lockFile, { force: true });
    handle = await open(lockFile, 'wx');
    ownsLock = true;
  }
  await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  await handle.close();
  handle = undefined;
  await run(process.execPath, [path.join('scripts', 'chapters', 'publish-due.mjs')], { stdio: 'inherit' });
  await run(process.execPath, [path.join('scripts', 'media', 'sync-public.mjs')], { stdio: 'inherit' });
  await run(process.execPath, [path.join('scripts', 'auth', 'cleanup.mjs')], { stdio: 'inherit' });
  console.log('Job vận hành hoàn tất.');
} catch (error) {
  console.error(`Job vận hành thất bại: ${error instanceof Error ? error.message : 'Lỗi không xác định.'}`);
  process.exitCode = 1;
} finally {
  await handle?.close().catch(() => {});
  if (ownsLock) await rm(lockFile, { force: true }).catch(() => {});
}
