import 'server-only';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { ApiError } from '../http/errors';
import { assertTrustedOrigin } from '../auth/security';
import { requireUser } from '../auth/session';
import { consumeAuthLimit } from '../auth/rateLimit';
import { actorInTransaction, audit, transaction } from '../catalog/common';
import { requireStory } from '../chapters/access';
import { privateMediaStorage } from './storage';
import { mediaUrl } from '@/shared/lib/storage/media';

const state = globalThis as typeof globalThis & { mediaUploadWork?: number };
async function limitedForm(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;'))
    throw new ApiError('INVALID_REQUEST', 'Upload cần multipart/form-data.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError('INVALID_REQUEST', 'Thiếu ảnh.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > 24 * 1024 * 1024) {
        await reader.cancel();
        throw new ApiError('INVALID_REQUEST', 'Mỗi request tối đa 24 MB.');
      }
      chunks.push(item.value);
    }
    return await new Response(Buffer.concat(chunks), {
      headers: { 'Content-Type': request.headers.get('content-type')! },
    }).formData();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('INVALID_REQUEST', 'Upload không hợp lệ.');
  } finally {
    reader.releaseLock();
  }
}
async function encode(file: File) {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size < 1 ||
    file.size > 10 * 1024 * 1024
  )
    throw new ApiError(
      'INVALID_REQUEST',
      'Ảnh phải là JPG/PNG/WebP, tối đa 10 MB.',
    );
  const source = Buffer.from(await file.arrayBuffer());
  const format = source.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    ? 'jpeg'
    : source
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? 'png'
      : source.toString('ascii', 0, 4) === 'RIFF' &&
          source.toString('ascii', 8, 12) === 'WEBP'
        ? 'webp'
        : null;
  if (!format || file.type !== `image/${format}`)
    throw new ApiError('INVALID_REQUEST', 'MIME và nội dung ảnh không khớp.');
  try {
    const image = sharp(source, {
      limitInputPixels: 40_000_000,
      failOn: 'warning',
    });
    const metadata = await image.metadata();
    if (
      metadata.format !== format ||
      (metadata.pages || 1) !== 1 ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > 16000 ||
      metadata.height > 30000
    )
      throw new Error('Invalid image');
    // Re-encoding strips metadata and executable/vector formats. Objects are never overwritten.
    const result = await image
      .rotate()
      .resize({ width: 2400, withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer({ resolveWithObject: true });
    if (result.data.length > 16 * 1024 * 1024)
      throw new Error('Output too large');
    return result;
  } catch {
    throw new ApiError(
      'INVALID_REQUEST',
      'Ảnh hỏng, ảnh động hoặc kích thước vượt giới hạn (40 megapixel).',
    );
  }
}
export async function uploadMedia(request: Request, storyId: string) {
  assertTrustedOrigin(request);
  const user = await requireUser(request);
  await requireStory(user, storyId, 'chapters.manage');
  await consumeAuthLimit('media-upload', user.id, 360);
  if ((state.mediaUploadWork || 0) >= 2)
    throw new ApiError(
      'SERVICE_UNAVAILABLE',
      'Máy chủ đang xử lý ảnh. Hãy thử lại.',
    );
  state.mediaUploadWork = (state.mediaUploadWork || 0) + 1;
  const writtenKeys: string[] = [];
  try {
    const form = await limitedForm(request);
    for (const key of form.keys())
      if (!['files', 'kind'].includes(key))
        throw new ApiError(
          'INVALID_REQUEST',
          'Upload chứa trường không được phép.',
        );
    const kind = form.get('kind') || 'comic';
    if (kind !== 'comic' && kind !== 'covers')
      throw new ApiError('INVALID_REQUEST', 'Loại ảnh không hợp lệ.');
    const files = form.getAll('files');
    if (
      !files.length ||
      files.length > 2 ||
      files.some((file) => !(file instanceof File)) ||
      (kind === 'covers' && files.length !== 1)
    )
      throw new ApiError(
        'INVALID_REQUEST',
        'Upload tối đa 2 ảnh/request, 1 ảnh nếu là bìa.',
      );
    const rows: {
      storageKey: string;
      kind: string;
      storyId: string;
      width: number;
      height: number;
      fileSize: number;
      alt: string;
      createdBy: string;
    }[] = [];
    for (const entry of files) {
      const file = entry as File,
        encoded = await encode(file),
        key = `${kind}/${randomUUID()}.webp`;
      await privateMediaStorage().put(key, encoded.data);
      writtenKeys.push(key);
      rows.push({
        storageKey: key,
        kind,
        storyId,
        width: encoded.info.width,
        height: encoded.info.height,
        fileSize: encoded.data.length,
        alt: file.name.slice(0, 200),
        createdBy: user.id,
      });
    }
    const result = await transaction(async (tx) => {
      const actor = await actorInTransaction(tx, user);
      await requireStory(actor, storyId, 'chapters.manage', tx, true);
      const assets = [];
      for (const row of rows)
        assets.push(await tx.mediaAsset.create({ data: row }));
      await audit(tx, actor, 'media.upload', 'story', storyId);
      return assets.map((asset) => ({
        id: asset.id,
        assetId: asset.id,
        storageKey: asset.storageKey,
        image: mediaUrl(asset.storageKey)!,
        width: asset.width,
        height: asset.height,
        alt: asset.alt,
      }));
    });
    writtenKeys.length = 0;
    return result;
  } catch (error) {
    await Promise.allSettled(
      writtenKeys.map((key) => privateMediaStorage().delete(key)),
    );
    throw error;
  } finally {
    state.mediaUploadWork -= 1;
  }
}
