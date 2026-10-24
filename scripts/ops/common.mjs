import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { lstat, mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { finished } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import { databaseUrl, loadDatabaseEnvironment } from '../db/environment.mjs';

export const BACKUP_VERSION = 1;

export function loadOperationsEnvironment() {
  loadDatabaseEnvironment();
  const url = databaseUrl();
  const database = decodeURIComponent(url.pathname.slice(1));
  const user = decodeURIComponent(url.username);
  const container = process.env.BACKUP_POSTGRES_CONTAINER || 'vuon-ngon-tinh-postgres';
  if (!/^[a-zA-Z0-9_.-]+$/.test(container)) throw new Error('Tên PostgreSQL container không hợp lệ.');
  if (!/^[a-zA-Z0-9_-]+$/.test(database) || !user) throw new Error('Tên database/user không hợp lệ.');
  const workspace = process.cwd();
  const backupRoot = path.resolve(process.env.BACKUP_ROOT || path.join(workspace, '.data', 'backups'));
  const mediaRoot = path.resolve(process.env.LOCAL_MEDIA_ROOT || path.join(workspace, '.data', 'media'));
  if (backupRoot === mediaRoot || backupRoot.startsWith(`${mediaRoot}${path.sep}`)) {
    throw new Error('BACKUP_ROOT không được nằm trong kho media.');
  }
  return { backupRoot, container, database, mediaRoot, user, workspace };
}

export function backupId() {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `${timestamp}-${randomBytes(3).toString('hex')}`;
}

export async function sha256(file) {
  const hash = createHash('sha256');
  const input = createReadStream(file);
  input.on('data', (chunk) => hash.update(chunk));
  await finished(input);
  return hash.digest('hex');
}

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} thất bại (mã ${code}). ${stderr.slice(-2000)}`));
    });
  });
}

export function pipeCommandToFile(command, args, destination) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    const output = createWriteStream(destination, { flags: 'wx' });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.stdout.pipe(output);
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(error);
    };
    child.once('error', fail);
    output.once('error', fail);
    child.once('close', async (code) => {
      if (settled) return;
      try { await finished(output); } catch (error) { fail(error); return; }
      if (code !== 0) fail(new Error(`${command} thất bại (mã ${code}). ${stderr.slice(-2000)}`));
      else { settled = true; resolve(); }
    });
  });
}

export function pipeFileToCommand(source, command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    const input = createReadStream(source);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    input.pipe(child.stdin);
    input.once('error', reject);
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} thất bại (mã ${code}). ${stderr.slice(-2000)}`));
    });
  });
}

export async function listMediaFiles(root) {
  try {
    if (!(await stat(root)).isDirectory()) throw new Error('Kho media không phải thư mục.');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const details = await lstat(absolute);
      if (details.isSymbolicLink()) throw new Error('Kho media chứa symbolic link; dừng backup để tránh đọc ngoài phạm vi.');
      if (details.isDirectory()) await visit(absolute);
      else if (details.isFile()) files.push(absolute);
    }
  }
  await visit(root);
  return files.sort();
}

export function safeRelative(root, absolute) {
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Đường dẫn vượt ngoài phạm vi.');
  return relative.split(path.sep).join('/');
}

export async function loadManifest(backupDirectory) {
  const directory = path.resolve(backupDirectory);
  const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
  if (manifest.version !== BACKUP_VERSION || !manifest.database?.file || !Array.isArray(manifest.media?.files)) {
    throw new Error('Manifest backup không đúng phiên bản hoặc thiếu dữ liệu.');
  }
  return { directory, manifest };
}

export async function atomicJson(file, value) {
  const temporary = `${file}.tmp-${randomBytes(3).toString('hex')}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  await rename(temporary, file);
}

export async function ensureDirectory(directory) {
  await mkdir(directory, { recursive: true });
}
