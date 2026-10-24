import 'server-only';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ApiError } from '../http/errors';

type R2Configuration = {
  bucket: string;
  client: S3Client;
};

let cached: R2Configuration | undefined;

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new ApiError('SERVICE_UNAVAILABLE', `Thiếu cấu hình ${name}.`);
  return value;
}

function configuration() {
  if (cached) return cached;
  const accountId = required('R2_ACCOUNT_ID');
  if (!/^[a-f0-9]{32}$/i.test(accountId))
    throw new ApiError('SERVICE_UNAVAILABLE', 'R2_ACCOUNT_ID không hợp lệ.');
  const bucket = required('R2_PRIVATE_BUCKET');
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket))
    throw new ApiError('SERVICE_UNAVAILABLE', 'R2_PRIVATE_BUCKET không hợp lệ.');
  cached = {
    bucket,
    client: new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: required('R2_ACCESS_KEY_ID'),
        secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
      },
      maxAttempts: 3,
    }),
  };
  return cached;
}

function publicBucket() {
  const bucket = required('R2_PUBLIC_BUCKET');
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket))
    throw new ApiError('SERVICE_UNAVAILABLE', 'R2_PUBLIC_BUCKET không hợp lệ.');
  return bucket;
}

function copySource(bucket: string, key: string) {
  return `${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

function notFound(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const value = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return value.name === 'NoSuchKey' || value.$metadata?.httpStatusCode === 404;
}

export const r2PrivateMedia = {
  async put(key: string, data: Buffer) {
    const { bucket, client } = configuration();
    try {
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: data,
        ContentType: 'image/webp',
        CacheControl: 'private, no-store',
        IfNoneMatch: '*',
      }));
    } catch {
      throw new ApiError('SERVICE_UNAVAILABLE', 'Không thể lưu ảnh lên R2.');
    }
  },
  async get(key: string) {
    const { bucket, client } = configuration();
    try {
      const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!response.Body || (response.ContentLength || 0) > 20 * 1024 * 1024)
        throw new Error('Invalid R2 object');
      return Buffer.from(await response.Body.transformToByteArray());
    } catch (error) {
      if (notFound(error)) throw new ApiError('NOT_FOUND', 'Không tìm thấy ảnh trên storage.');
      throw new ApiError('SERVICE_UNAVAILABLE', 'Không thể đọc ảnh từ R2.');
    }
  },
  async delete(key: string) {
    const { bucket, client } = configuration();
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } catch {
      throw new ApiError('SERVICE_UNAVAILABLE', 'Không thể dọn ảnh trên R2.');
    }
  },
};

export const r2PublicMedia = {
  async promote(key: string) {
    const { bucket: sourceBucket, client } = configuration();
    try {
      await client.send(new CopyObjectCommand({
        Bucket: publicBucket(),
        Key: key,
        CopySource: copySource(sourceBucket, key),
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
        MetadataDirective: 'REPLACE',
      }));
    } catch {
      throw new ApiError('SERVICE_UNAVAILABLE', 'Không thể đưa ảnh lên CDN R2.');
    }
  },
  async delete(key: string) {
    const { client } = configuration();
    try {
      await client.send(new DeleteObjectCommand({ Bucket: publicBucket(), Key: key }));
    } catch {
      throw new ApiError('SERVICE_UNAVAILABLE', 'Không thể gỡ ảnh khỏi CDN R2.');
    }
  },
};
