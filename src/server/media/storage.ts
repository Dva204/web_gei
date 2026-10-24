import 'server-only';
import { ApiError } from '../http/errors';
import { localMedia } from './local';
import { r2PrivateMedia, r2PublicMedia } from './r2';
import { mediaUrl } from '@/shared/lib/storage/media';

export type MediaStorage = {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
};

export function privateMediaStorage(): MediaStorage {
  const driver = process.env.MEDIA_STORAGE_DRIVER?.trim() || 'local';
  if (driver === 'local') return localMedia;
  if (driver === 'r2') return r2PrivateMedia;
  throw new ApiError('SERVICE_UNAVAILABLE', 'MEDIA_STORAGE_DRIVER không được hỗ trợ.');
}

function driver() {
  return process.env.MEDIA_STORAGE_DRIVER?.trim() || 'local';
}

export async function promotePublicMedia(keys: string[]) {
  if (driver() === 'local') return;
  if (driver() !== 'r2')
    throw new ApiError('SERVICE_UNAVAILABLE', 'MEDIA_STORAGE_DRIVER không được hỗ trợ.');
  const unique = [...new Set(keys)];
  for (let offset = 0; offset < unique.length; offset += 6)
    await Promise.all(unique.slice(offset, offset + 6).map((key) => r2PublicMedia.promote(key)));
}

export async function deletePublicMedia(keys: string[]) {
  if (driver() === 'local') return;
  if (driver() !== 'r2')
    throw new ApiError('SERVICE_UNAVAILABLE', 'MEDIA_STORAGE_DRIVER không được hỗ trợ.');
  const unique = [...new Set(keys)];
  for (let offset = 0; offset < unique.length; offset += 6)
    await Promise.all(unique.slice(offset, offset + 6).map((key) => r2PublicMedia.delete(key)));
}

export function publishedMediaUrl(key: string) {
  if (driver() !== 'r2') return mediaUrl(key)!;
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, '');
  try {
    if (!base || new URL(base).protocol !== 'https:') throw new Error();
  } catch {
    throw new ApiError('SERVICE_UNAVAILABLE', 'Public media URL chưa được cấu hình HTTPS.');
  }
  return `${base}/${key.replace(/^\//, '')}`;
}

export async function purgePublishedUrls(keys: string[]) {
  if (driver() !== 'r2' || !keys.length) return { configured: true };
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  const token = process.env.CLOUDFLARE_CACHE_PURGE_TOKEN?.trim();
  if (!zoneId || !token) return { configured: false };
  if (!/^[a-f0-9]{32}$/i.test(zoneId))
    throw new ApiError('SERVICE_UNAVAILABLE', 'CLOUDFLARE_ZONE_ID không hợp lệ.');
  const urls = [...new Set(keys)].map(publishedMediaUrl);
  for (let offset = 0; offset < urls.length; offset += 30) {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: urls.slice(offset, offset + 30) }),
    });
    const body = await response.json().catch(() => null) as { success?: boolean } | null;
    if (!response.ok || !body?.success)
      throw new ApiError('SERVICE_UNAVAILABLE', 'Cloudflare chưa xác nhận purge cache.');
  }
  return { configured: true };
}
