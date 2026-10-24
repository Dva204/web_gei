import { copyFile, mkdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  BACKUP_VERSION,
  atomicJson,
  backupId,
  ensureDirectory,
  listMediaFiles,
  loadOperationsEnvironment,
  pipeCommandToFile,
  safeRelative,
  sha256,
} from './common.mjs';

const config = loadOperationsEnvironment();
const id = backupId();
const partial = path.join(config.backupRoot, `.partial-${id}`);
const destination = path.join(config.backupRoot, id);

try {
  await ensureDirectory(config.backupRoot);
  await mkdir(path.join(partial, 'media'), { recursive: true });
  const dump = path.join(partial, 'database.dump');
  await pipeCommandToFile('docker', [
    'exec', config.container, 'pg_dump', '-U', config.user, '-d', config.database,
    '--format=custom', '--no-owner', '--no-privileges',
  ], dump);

  const mediaFiles = [];
  for (const source of await listMediaFiles(config.mediaRoot)) {
    const relative = safeRelative(config.mediaRoot, source);
    const target = path.join(partial, 'media', ...relative.split('/'));
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
    const details = await stat(target);
    mediaFiles.push({ path: relative, size: details.size, sha256: await sha256(target) });
  }
  const dumpDetails = await stat(dump);
  await atomicJson(path.join(partial, 'manifest.json'), {
    version: BACKUP_VERSION,
    id,
    createdAt: new Date().toISOString(),
    database: {
      engine: 'postgresql',
      sourceName: config.database,
      file: 'database.dump',
      format: 'custom',
      size: dumpDetails.size,
      sha256: await sha256(dump),
    },
    media: { root: 'media', files: mediaFiles },
  });
  await rename(partial, destination);
  console.log(`Backup hoàn tất: ${destination}`);
  console.log(`Gồm database và ${mediaFiles.length} tệp media; manifest không chứa mật khẩu.`);
} catch (error) {
  await rm(partial, { recursive: true, force: true }).catch(() => {});
  console.error(`Backup thất bại: ${error instanceof Error ? error.message : 'Lỗi không xác định.'}`);
  process.exitCode = 1;
}
