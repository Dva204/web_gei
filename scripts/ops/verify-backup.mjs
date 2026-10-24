import { stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadManifest, loadOperationsEnvironment, pipeFileToCommand, sha256 } from './common.mjs';

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

export async function verifyBackup(input) {
  if (!input) throw new Error('Thiếu --from <thư-mục-backup>.');
  const config = loadOperationsEnvironment();
  const { directory, manifest } = await loadManifest(input);
  const dump = path.join(directory, manifest.database.file);
  const dumpDetails = await stat(dump);
  if (dumpDetails.size <= 0 || dumpDetails.size !== manifest.database.size || await sha256(dump) !== manifest.database.sha256) {
    throw new Error('Database dump sai kích thước hoặc checksum.');
  }
  for (const file of manifest.media.files) {
    if (!file.path || file.path.includes('..') || path.isAbsolute(file.path)) throw new Error('Manifest media có đường dẫn không an toàn.');
    const absolute = path.join(directory, manifest.media.root, ...file.path.split('/'));
    const details = await stat(absolute);
    if (details.size !== file.size || await sha256(absolute) !== file.sha256) {
      throw new Error(`Media hỏng hoặc thiếu: ${file.path}`);
    }
  }
  await pipeFileToCommand(dump, 'docker', ['exec', '-i', config.container, 'pg_restore', '--list']);
  return { config, directory, dump, manifest };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await verifyBackup(argument('--from'));
    console.log(`Backup hợp lệ: ${result.manifest.id}`);
    console.log(`Database dump đọc được; ${result.manifest.media.files.length} tệp media đúng checksum.`);
  } catch (error) {
    console.error(`Kiểm tra backup thất bại: ${error instanceof Error ? error.message : 'Lỗi không xác định.'}`);
    process.exitCode = 1;
  }
}
