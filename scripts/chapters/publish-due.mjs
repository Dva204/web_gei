import { Prisma, PrismaClient } from '@prisma/client';
import { CopyObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { loadDatabaseEnvironment } from '../db/environment.mjs';
loadDatabaseEnvironment();
const db = new PrismaClient();
let r2;
function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
async function promote(keys) {
  const driver = process.env.MEDIA_STORAGE_DRIVER?.trim() || 'local';
  if (driver === 'local') return;
  if (driver !== 'r2') throw new Error('Unsupported media storage driver');
  const privateBucket = required('R2_PRIVATE_BUCKET');
  const publicBucket = required('R2_PUBLIC_BUCKET');
  if (!r2) r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${required('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required('R2_ACCESS_KEY_ID'),
      secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
    },
    maxAttempts: 3,
  });
  const unique = [...new Set(keys)];
  for (let offset = 0; offset < unique.length; offset += 6) {
    await Promise.all(unique.slice(offset, offset + 6).map((key) => r2.send(new CopyObjectCommand({
      Bucket: publicBucket,
      Key: key,
      CopySource: `${encodeURIComponent(privateBucket)}/${key.split('/').map(encodeURIComponent).join('/')}`,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
      MetadataDirective: 'REPLACE',
    }))));
  }
}
let published = 0,
  blocked = 0;
try {
  const due = await db.chapter.findMany({
    where: {
      deletedAt: null,
      status: 'scheduled',
      publishAt: { lte: new Date() },
    },
    orderBy: { publishAt: 'asc' },
    take: 50,
    select: { id: true, storyId: true },
  });
  for (const item of due) {
    const result = await db.$transaction(async (tx) => {
      // Shared creator lock plus story/chapter locks match admin write ordering.
      const initial = await tx.chapter.findUnique({
        where: { id: item.id },
        select: { scheduledBy: true },
      });
      if (initial?.scheduledBy)
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${initial.scheduledBy} FOR SHARE`;
      const locked =
        await tx.$queryRaw`SELECT "id" FROM "Story" WHERE "id" = ${item.storyId} FOR UPDATE SKIP LOCKED`;
      if (!locked.length) return 'skip';
      const rows =
        await tx.$queryRaw`SELECT "id" FROM "Chapter" WHERE "id" = ${item.id} FOR UPDATE SKIP LOCKED`;
      if (!rows.length) return 'skip';
      const chapter = await tx.chapter.findUnique({ where: { id: item.id } });
      if (
        !chapter ||
        chapter.deletedAt ||
        chapter.status !== 'scheduled' ||
        !chapter.publishAt ||
        chapter.publishAt > new Date()
      )
        return 'skip';
      const story = await tx.story.findUnique({ where: { id: item.storyId } });
      const creator = chapter.scheduledBy
        ? await tx.user.findUnique({
            where: { id: chapter.scheduledBy },
            select: { id: true, role: true, status: true },
          })
        : null;
      const manifest = chapter.scheduledManifest;
      const validManifest =
        Array.isArray(manifest) &&
        manifest.length > 0 &&
        manifest.length <= 300 &&
        manifest.every(
          (page, index) =>
            page &&
            page.pageNumber === index + 1 &&
            typeof page.storageKey === 'string' &&
            /^comic\/[a-f0-9-]{36}\.webp$/.test(page.storageKey) &&
            Number.isSafeInteger(page.width) &&
            page.width > 0 &&
            Number.isSafeInteger(page.height) &&
            page.height > 0,
        );
      const keys = validManifest ? manifest.map((page) => page.storageKey) : [];
      const assets = keys.length
        ? await tx.mediaAsset.count({
            where: {
              storyId: item.storyId,
              kind: 'comic',
              storageKey: { in: keys },
            },
          })
        : 0;
      const permitted =
        creator?.status === 'active' &&
        ['admin', 'editor'].includes(creator.role);
      const rights =
        story &&
        !story.deletedAt &&
        story.visibility === 'public' &&
        story.rightsType &&
        (story.rightsType === 'own' || story.rightsNote?.trim()) &&
        (!story.rightsExpiresAt || story.rightsExpiresAt > new Date());
      if (!permitted || !rights || !validManifest || assets !== keys.length) {
        await tx.chapter.update({
          where: { id: item.id },
          data: {
            status: 'draft',
            publishAt: null,
            scheduledBy: null,
            scheduledManifest: Prisma.DbNull,
            revision: { increment: 1 },
          },
        });
        await tx.auditLog.create({
          data: {
            userId: creator?.id,
            action: 'chapter.schedule_blocked',
            objectType: 'chapter',
            objectId: item.id,
            summary:
              'Lịch bị hủy: quyền tài khoản, quyền nội dung hoặc snapshot không còn hợp lệ.',
          },
        });
        return 'blocked';
      }
      await promote(keys);
      await tx.chapterPublication.upsert({
        where: { chapterId: item.id },
        create: {
          chapterId: item.id,
          pageManifest: manifest,
          revision: chapter.revision + 1,
          publishedBy: creator.id,
        },
        update: {
          pageManifest: manifest,
          revision: chapter.revision + 1,
          publishedBy: creator.id,
          publishedAt: new Date(),
        },
      });
      await tx.chapter.update({
        where: { id: item.id },
        data: {
          status: 'published',
          publishedAt: new Date(),
          publishAt: null,
          scheduledBy: null,
          scheduledManifest: Prisma.DbNull,
          revision: { increment: 1 },
        },
      });
      const aggregate = await tx.chapter.aggregate({
        where: {
          storyId: item.storyId,
          deletedAt: null,
          publication: { isNot: null },
        },
        _count: true,
        _max: { number: true },
      });
      await tx.story.update({
        where: { id: item.storyId },
        data: {
          totalChapters: aggregate._count,
          latestChapter: aggregate._max.number || 0,
          revision: { increment: 1 },
        },
      });
      await tx.auditLog.create({
        data: {
          userId: creator.id,
          action: 'chapter.scheduled_publish',
          objectType: 'chapter',
          objectId: item.id,
          summary: 'Worker xuất bản snapshot theo lịch.',
        },
      });
      return 'published';
    }, { maxWait: 10_000, timeout: 120_000 });
    if (result === 'published') published++;
    if (result === 'blocked') blocked++;
  }
  console.log(
    `Lịch đăng: ${published} chap xuất bản, ${blocked} lịch bị chặn. Tối đa 50 chap/lần.`,
  );
} catch {
  console.error(
    'Worker chưa hoàn tất. Kiểm tra DB/migration; không tự cấp quyền hoặc công khai truyện.',
  );
  process.exitCode = 1;
} finally {
  r2?.destroy();
  await db.$disconnect().catch(() => {});
}
