import { access, copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pipeFileToCommand, run } from './common.mjs';
import { verifyBackup } from './verify-backup.mjs';

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const source = argument('--from');
const targetDatabase = argument('--target-database');
const replace = process.argv.includes('--replace');

try {
  if (!targetDatabase || !/^[a-zA-Z0-9_]+_restore$/.test(targetDatabase)) {
    throw new Error('--target-database bắt buộc và phải kết thúc bằng _restore.');
  }
  const verified = await verifyBackup(source);
  if (targetDatabase === verified.config.database) throw new Error('Không được restore đè database ứng dụng.');
  const mediaDestination = path.join(verified.config.workspace, '.data', 'restored-media', verified.manifest.id);
  const mediaExists = await access(mediaDestination).then(() => true, () => false);
  if (mediaExists && !replace) throw new Error('Media rehearsal đã tồn tại; dùng --replace để tạo lại.');
  const query = `SELECT 1 FROM pg_database WHERE datname = '${targetDatabase}'`;
  const existing = await run('docker', [
    'exec', verified.config.container, 'psql', '-U', verified.config.user, '-d', 'postgres', '-tAc', query,
  ]);
  if (existing.stdout.trim() && !replace) throw new Error('Database đích đã tồn tại; dùng --replace để tạo lại database rehearsal.');
  if (existing.stdout.trim()) {
    await run('docker', ['exec', verified.config.container, 'dropdb', '-U', verified.config.user, '--force', targetDatabase]);
  }
  await run('docker', ['exec', verified.config.container, 'createdb', '-U', verified.config.user, targetDatabase]);
  await pipeFileToCommand(verified.dump, 'docker', [
    'exec', '-i', verified.config.container, 'pg_restore', '-U', verified.config.user,
    '-d', targetDatabase, '--exit-on-error', '--no-owner', '--no-privileges',
  ]);

  if (mediaExists) await rm(mediaDestination, { recursive: true, force: true });
  await mkdir(mediaDestination, { recursive: true });
  for (const file of verified.manifest.media.files) {
    const sourceFile = path.join(verified.directory, verified.manifest.media.root, ...file.path.split('/'));
    const destinationFile = path.join(mediaDestination, ...file.path.split('/'));
    await mkdir(path.dirname(destinationFile), { recursive: true });
    await copyFile(sourceFile, destinationFile);
  }
  console.log(`Restore rehearsal hoàn tất vào database: ${targetDatabase}`);
  console.log(`Media rehearsal: ${mediaDestination}`);
  console.log('Database và media đang chạy không bị thay đổi.');
} catch (error) {
  console.error(`Restore rehearsal thất bại: ${error instanceof Error ? error.message : 'Lỗi không xác định.'}`);
  process.exitCode = 1;
}
