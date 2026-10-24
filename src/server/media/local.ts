import 'server-only';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ApiError } from '../http/errors';

const root = () => {
  // Dedicated vault for the isolated smoke runner; never configurable in production.
  const fixture =
    process.env.NODE_ENV === 'test' && process.env.RUN_CHAPTER_DB_SMOKE === '1'
      ? process.env.MEDIA_TEST_VAULT
      : undefined;
  if (fixture && !/^media_test_[a-f0-9]{24}$/.test(fixture))
    throw new ApiError('SERVICE_UNAVAILABLE', 'Kho ảnh test không hợp lệ.');
  return path.resolve(process.cwd(), '.data', fixture || 'media');
};
function assetPath(key: string) {
  if (!/^(?:comic|covers)\/[a-f0-9-]{36}\.webp$/.test(key))
    throw new ApiError('NOT_FOUND', 'Không tìm thấy ảnh.');
  const target = path.resolve(root(), key);
  if (!target.startsWith(root() + path.sep))
    throw new ApiError('NOT_FOUND', 'Không tìm thấy ảnh.');
  return target;
}
export const localMedia = {
  async put(key: string, data: Buffer) {
    if (
      process.env.MEDIA_STORAGE_DRIVER &&
      process.env.MEDIA_STORAGE_DRIVER !== 'local'
    )
      throw new ApiError('SERVICE_UNAVAILABLE', 'Storage chưa được cấu hình.');
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.MEDIA_LOCAL_PERSISTENT !== 'true'
    )
      throw new ApiError(
        'SERVICE_UNAVAILABLE',
        'Local storage production cần volume bền vững và MEDIA_LOCAL_PERSISTENT=true.',
      );
    const target = assetPath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data, { flag: 'wx' });
  },
  async get(key: string) {
    try {
      return await readFile(assetPath(key));
    } catch {
      throw new ApiError('NOT_FOUND', 'Không tìm thấy ảnh trên storage.');
    }
  },
  async delete(key: string) {
    try {
      await unlink(assetPath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
        throw new ApiError('SERVICE_UNAVAILABLE', 'Không thể dọn ảnh trên storage.');
    }
  },
};
