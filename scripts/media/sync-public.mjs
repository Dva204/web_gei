import nextEnv from '@next/env';
import { PrismaClient } from '@prisma/client';
import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production', { info() {}, error() {} });

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thiếu ${name}.`);
  return value;
}

const keyPattern = /^(?:comic|covers)\/[a-f0-9-]{36}\.webp$/;
const driver = process.env.MEDIA_STORAGE_DRIVER?.trim() || 'local';
let db;
let client;

try {
  if (driver === 'local') {
    console.log('Đồng bộ CDN bỏ qua vì media đang dùng local storage.');
  } else {
    if (driver !== 'r2') throw new Error('MEDIA_STORAGE_DRIVER không được hỗ trợ.');
    const privateBucket = required('R2_PRIVATE_BUCKET');
    const publicBucket = required('R2_PUBLIC_BUCKET');
    const graceHours = Number(process.env.PUBLIC_MEDIA_ORPHAN_GRACE_HOURS || 24);
    if (!Number.isInteger(graceHours) || graceHours < 1 || graceHours > 168)
      throw new Error('PUBLIC_MEDIA_ORPHAN_GRACE_HOURS phải từ 1 đến 168.');
    db = new PrismaClient();
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${required('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: required('R2_ACCESS_KEY_ID'),
        secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
      },
      maxAttempts: 3,
    });

    const stories = await db.story.findMany({
      where: {
        deletedAt: null,
        visibility: 'public',
        rightsType: { not: null },
        chapters: { some: { deletedAt: null, publication: { isNot: null } } },
        AND: [
          { OR: [{ rightsType: 'own' }, { rightsNote: { not: null }, NOT: { rightsNote: '' } }] },
          { OR: [{ rightsExpiresAt: null }, { rightsExpiresAt: { gt: new Date() } }] },
        ],
      },
      select: {
        coverStorageKey: true,
        chapters: {
          where: { deletedAt: null, publication: { isNot: null } },
          select: { publication: { select: { pageManifest: true } } },
        },
      },
    });
    const referenced = new Set();
    for (const story of stories) {
      if (story.coverStorageKey && keyPattern.test(story.coverStorageKey)) referenced.add(story.coverStorageKey);
      for (const chapter of story.chapters) {
        const manifest = chapter.publication?.pageManifest;
        if (!Array.isArray(manifest)) continue;
        for (const page of manifest) {
          const key = page && typeof page === 'object' && !Array.isArray(page) ? page.storageKey : null;
          if (typeof key === 'string' && keyPattern.test(key)) referenced.add(key);
        }
      }
    }

    const objects = [];
    for (const prefix of ['comic/', 'covers/']) {
      let continuationToken;
      do {
        const page = await client.send(new ListObjectsV2Command({
          Bucket: publicBucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }));
        objects.push(...(page.Contents || []));
        continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (continuationToken);
    }
    const existing = new Set(objects.flatMap((item) => item.Key && keyPattern.test(item.Key) ? [item.Key] : []));

    const missing = [...referenced].filter((key) => !existing.has(key));
    for (let offset = 0; offset < missing.length; offset += 6) {
      await Promise.all(missing.slice(offset, offset + 6).map((key) => client.send(new CopyObjectCommand({
        Bucket: publicBucket,
        Key: key,
        CopySource: `${encodeURIComponent(privateBucket)}/${key.split('/').map(encodeURIComponent).join('/')}`,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
        MetadataDirective: 'REPLACE',
      }))));
    }

    const cutoff = Date.now() - graceHours * 60 * 60 * 1000;
    const stale = objects.flatMap((item) =>
      item.Key && keyPattern.test(item.Key) && !referenced.has(item.Key) && item.LastModified && +item.LastModified < cutoff
        ? [item.Key]
        : [],
    );
    for (let offset = 0; offset < stale.length; offset += 1000) {
      const result = await client.send(new DeleteObjectsCommand({
        Bucket: publicBucket,
        Delete: { Quiet: true, Objects: stale.slice(offset, offset + 1000).map((Key) => ({ Key })) },
      }));
      if (result.Errors?.length) throw new Error(`R2 không xóa được ${result.Errors.length} object.`);
    }
    console.log(`Đồng bộ CDN: ${referenced.size} media đang tham chiếu, bù ${missing.length}, xóa ${stale.length} object mồ côi quá ${graceHours} giờ.`);
  }
} catch (error) {
  console.error(`Đồng bộ CDN thất bại: ${error instanceof Error ? error.message : 'Lỗi không xác định.'}`);
  process.exitCode = 1;
} finally {
  client?.destroy();
  await db?.$disconnect().catch(() => {});
}
