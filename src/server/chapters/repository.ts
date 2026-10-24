import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { ApiError } from '../http/errors';
import {
  actorInTransaction,
  audit,
  grant,
  transaction,
} from '../catalog/common';
import {
  assertRights,
  enumValue,
  exact,
  idValue,
  pageQuery,
  revisionValue,
  text,
} from '../catalog/input';
import { requireStory, chapNumber } from './access';
import { mediaUrl } from '@/shared/lib/storage/media';
import { promotePublicMedia } from '../media/storage';
import type { SessionUser } from '@/shared/lib/auth/types';
import type { ChapterAdmin } from '@/features/admin/types';

const include = {
  pages: { orderBy: { pageNumber: 'asc' as const } },
  publication: { select: { revision: true, publishedAt: true } },
} satisfies Prisma.ChapterInclude;
type Row = Prisma.ChapterGetPayload<{ include: typeof include }>;
export function chapterDto(row: Row): ChapterAdmin {
  return {
    id: row.id,
    storyId: row.storyId,
    number: row.number,
    title: row.title,
    content: '',
    wordCount: 0,
    revision: row.revision,
    deletedAt: row.deletedAt?.toISOString(),
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: '',
    hasPublication: Boolean(row.publication),
    publicationRevision: row.publication?.revision,
    publishedAt: row.publication?.publishedAt.toISOString(),
    publishAt: row.publishAt?.toISOString(),
    pageCount: row.pages.length,
    pages: row.pages.map((page) => ({
      id: page.storageKey,
      storageKey: page.storageKey,
      image: mediaUrl(page.storageKey)!,
      width: page.width,
      height: page.height,
      alt: page.alt || `Trang ${page.pageNumber}`,
    })),
  };
}
export async function getChapter(
  user: SessionUser,
  storyId: string,
  number: unknown,
) {
  await requireStory(user, storyId);
  const row = await prisma.chapter.findFirst({
    where: { storyId, number: chapNumber(number), deletedAt: null },
    include,
  });
  if (!row) throw new ApiError('NOT_FOUND', 'Không tìm thấy chap.');
  return chapterDto(row);
}
export async function listChapters(
  user: SessionUser,
  storyId: string,
  query: URLSearchParams,
) {
  await requireStory(user, storyId);
  const paging = pageQuery(query),
    status = query.get('status');
  const where: Prisma.ChapterWhereInput = {
    storyId,
    deletedAt: null,
    ...(status
      ? {
          status: enumValue(
            status,
            [
              'draft',
              'translating',
              'editing',
              'beta',
              'ready',
              'published',
              'scheduled',
            ] as const,
            'Trạng thái',
          ),
        }
      : {}),
  };
  const total = await prisma.chapter.count({ where }),
    totalPages = Math.ceil(total / paging.pageSize),
    page = Math.min(paging.page, Math.max(1, totalPages));
  const rows = await prisma.chapter.findMany({
    where,
    include,
    orderBy: { number: 'asc' },
    skip: (page - 1) * paging.pageSize,
    take: paging.pageSize,
  });
  const aggregate = await prisma.chapter.aggregate({
    where: { storyId },
    _max: { number: true },
  });
  return {
    items: rows.map(chapterDto),
    total,
    totalPages,
    page,
    pageSize: paging.pageSize,
    nextNumber: (aggregate._max.number || 0) + 1,
  };
}
type PageInput = {
  storageKey: string;
  width: number;
  height: number;
  fileSize: number;
  alt: string;
  pageNumber: number;
};
export async function assetPages(
  tx: Prisma.TransactionClient,
  storyId: string,
  value: unknown,
): Promise<PageInput[]> {
  if (
    !Array.isArray(value) ||
    value.length > 300 ||
    value.some((key) => typeof key !== 'string') ||
    new Set(value).size !== value.length
  )
    throw new ApiError(
      'INVALID_REQUEST',
      'Tối đa 300 ảnh không trùng, dùng khóa ảnh đã upload.',
    );
  const keys = value as string[];
  const assets = await tx.mediaAsset.findMany({
    where: { storyId, kind: 'comic', storageKey: { in: keys } },
  });
  const byKey = new Map(assets.map((asset) => [asset.storageKey, asset]));
  if (assets.length !== keys.length)
    throw new ApiError(
      'INVALID_REQUEST',
      'Ảnh không thuộc truyện này hoặc chưa upload.',
    );
  return keys.map((key, index) => {
    const asset = byKey.get(key)!;
    return {
      storageKey: key,
      width: asset.width,
      height: asset.height,
      fileSize: asset.fileSize,
      alt: asset.alt,
      pageNumber: index + 1,
    };
  });
}
export const manifestOf = (pages: PageInput[]): Prisma.InputJsonArray =>
  pages.map((page) => ({ ...page }));
const rowManifest = (row: Row): Prisma.InputJsonArray =>
  row.pages.map((page) => ({
    storageKey: page.storageKey,
    width: page.width,
    height: page.height,
    fileSize: page.fileSize,
    alt: page.alt || '',
    pageNumber: page.pageNumber,
  }));
async function lockedChapter(
  tx: Prisma.TransactionClient,
  storyId: string,
  number: unknown,
  revision: unknown,
) {
  const n = chapNumber(number);
  await tx.$queryRaw`SELECT "id" FROM "Chapter" WHERE "storyId" = ${storyId} AND "number" = ${n} FOR UPDATE`;
  const row = await tx.chapter.findFirst({
    where: { storyId, number: n, deletedAt: null },
    include,
  });
  if (!row) throw new ApiError('NOT_FOUND', 'Không tìm thấy chap.');
  if (row.revision !== revisionValue(revision))
    throw new ApiError(
      'CONFLICT',
      'Chap đã thay đổi ở phiên khác. Tải lại trước khi lưu.',
    );
  return row;
}
async function snapshotVersion(
  tx: Prisma.TransactionClient,
  user: SessionUser,
  row: Row,
  note: string,
) {
  await tx.chapterVersion.create({
    data: {
      chapterId: row.id,
      pageManifest: rowManifest(row),
      content: '',
      note,
      savedBy: user.id,
    },
  });
}
async function refreshStory(tx: Prisma.TransactionClient, storyId: string) {
  const chapters = await tx.chapter.aggregate({
    where: { storyId, deletedAt: null, publication: { isNot: null } },
    _count: true,
    _max: { number: true },
  });
  await tx.story.update({
    where: { id: storyId },
    data: {
      totalChapters: chapters._count,
      latestChapter: chapters._max.number || 0,
      revision: { increment: 1 },
    },
  });
}
export async function saveChapter(
  user: SessionUser,
  storyId: string,
  input: Record<string, unknown>,
  number?: unknown,
) {
  exact(
    input,
    number === undefined
      ? ['number', 'title', 'pageKeys', 'status']
      : ['title', 'pageKeys', 'status', 'revision'],
  );
  const title = text(input.title, 'Tên chap', 180),
    status = enumValue(
      input.status || 'draft',
      ['draft', 'translating', 'editing', 'beta', 'ready'] as const,
      'Trạng thái nháp',
    );
  return transaction(async (tx) => {
    const actor = await actorInTransaction(tx, user);
    await requireStory(actor, storyId, 'chapters.manage', tx, true);
    const row =
      number === undefined
        ? null
        : await lockedChapter(tx, storyId, number, input.revision);
    const pages = await assetPages(tx, storyId, input.pageKeys);
    if (row) await snapshotVersion(tx, actor, row, 'Trước khi lưu nháp');
    const saved = row
      ? await tx.chapter.update({
          where: { id: row.id },
          data: {
            title,
            status,
            revision: { increment: 1 },
            publishAt: null,
            scheduledBy: null,
            scheduledManifest: Prisma.DbNull,
            pages: { deleteMany: {}, create: pages },
          },
          include,
        })
      : await tx.chapter.create({
          data: {
            storyId,
            number: chapNumber(input.number),
            title,
            status,
            pages: { create: pages },
          },
          include,
        });
    await audit(
      tx,
      actor,
      row ? 'chapter.save' : 'chapter.create',
      'chapter',
      saved.id,
    );
    return chapterDto(saved);
  });
}
export async function publicationAction(
  user: SessionUser,
  storyId: string,
  number: unknown,
  input: Record<string, unknown>,
) {
  exact(input, ['action', 'revision', 'publishAt']);
  const action = enumValue(
    input.action,
    ['publish', 'unpublish', 'schedule', 'cancel'] as const,
    'Thao tác',
  );
  return transaction(async (tx) => {
    const actor = await actorInTransaction(tx, user);
    grant(actor, 'chapters.publish');
    const story = await requireStory(
        actor,
        storyId,
        'chapters.publish',
        tx,
        true,
      ),
      row = await lockedChapter(tx, storyId, number, input.revision);
    let publishAt: Date | null = null;
    if (action === 'publish' || action === 'schedule') {
      if (story.visibility !== 'public')
        throw new ApiError(
          'INVALID_REQUEST',
          'Đặt truyện thành công khai trong Thông tin truyện trước khi xuất bản chap.',
        );
      assertRights(story);
      if (!row.pages.length)
        throw new ApiError('INVALID_REQUEST', 'Chap cần ít nhất một ảnh.');
      const publishPages = await assetPages(
        tx,
        storyId,
        row.pages.map((page) => page.storageKey),
      );
      if (action === 'publish')
        await promotePublicMedia(publishPages.map((page) => page.storageKey));
      if (action === 'schedule') {
        publishAt = new Date(text(input.publishAt, 'Thời gian đăng', 40, true));
        if (
          !Number.isFinite(+publishAt) ||
          +publishAt <= Date.now() ||
          +publishAt > Date.now() + 365 * 86400000 ||
          (story.rightsExpiresAt && story.rightsExpiresAt <= publishAt)
        )
          throw new ApiError(
            'INVALID_REQUEST',
            'Lịch đăng phải trong tương lai, tối đa 365 ngày và trước khi quyền hết hạn.',
          );
      }
    }
    await snapshotVersion(tx, actor, row, `Trước thao tác ${action}`);
    if (action === 'publish')
      await tx.chapterPublication.upsert({
        where: { chapterId: row.id },
        create: {
          chapterId: row.id,
          revision: row.revision + 1,
          pageManifest: rowManifest(row),
          publishedBy: actor.id,
        },
        update: {
          revision: row.revision + 1,
          pageManifest: rowManifest(row),
          publishedBy: actor.id,
          publishedAt: new Date(),
        },
      });
    if (action === 'unpublish')
      await tx.chapterPublication.deleteMany({ where: { chapterId: row.id } });
    const saved = await tx.chapter.update({
      where: { id: row.id },
      data: {
        revision: { increment: 1 },
        status:
          action === 'publish'
            ? 'published'
            : action === 'schedule'
              ? 'scheduled'
              : 'ready',
        publishAt,
        scheduledBy: action === 'schedule' ? actor.id : null,
        scheduledManifest:
          action === 'schedule' ? rowManifest(row) : Prisma.DbNull,
        ...(action === 'publish' ? { publishedAt: new Date() } : {}),
      },
      include,
    });
    await refreshStory(tx, storyId);
    await audit(tx, actor, `chapter.${action}`, 'chapter', row.id);
    return chapterDto(saved);
  }, { maxWait: 10_000, timeout: 120_000 });
}
export async function deleteChapter(
  user: SessionUser,
  storyId: string,
  number: unknown,
  input: Record<string, unknown>,
) {
  exact(input, ['revision']);
  return transaction(async (tx) => {
    const actor = await actorInTransaction(tx, user);
    grant(actor, 'chapters.publish');
    await requireStory(actor, storyId, 'chapters.publish', tx, true);
    const row = await lockedChapter(tx, storyId, number, input.revision);
    await snapshotVersion(tx, actor, row, 'Trước khi xóa mềm');
    await tx.chapter.update({
      where: { id: row.id },
      data: {
        deletedAt: new Date(),
        publishAt: null,
        scheduledBy: null,
        scheduledManifest: Prisma.DbNull,
        revision: { increment: 1 },
      },
    });
    await refreshStory(tx, storyId);
    await audit(tx, actor, 'chapter.trash', 'chapter', row.id);
    return { id: row.id, deleted: true };
  });
}
export async function listVersions(
  user: SessionUser,
  storyId: string,
  number: unknown,
) {
  const chapter = await getChapter(user, storyId, number);
  const rows = await prisma.chapterVersion.findMany({
    where: { chapterId: chapter.id },
    orderBy: { savedAt: 'desc' },
    take: 50,
  });
  return rows.map((row) => ({
    id: row.id,
    storyId,
    number: chapter.number,
    content: '',
    savedAt: row.savedAt.toISOString(),
    savedBy: row.savedBy || '',
    note: row.note || '',
    pageCount: Array.isArray(row.pageManifest) ? row.pageManifest.length : 0,
  }));
}
export async function restoreVersion(
  user: SessionUser,
  storyId: string,
  number: unknown,
  input: Record<string, unknown>,
) {
  exact(input, ['revision', 'versionId']);
  return transaction(async (tx) => {
    const actor = await actorInTransaction(tx, user);
    await requireStory(actor, storyId, 'chapters.manage', tx, true);
    const row = await lockedChapter(tx, storyId, number, input.revision),
      version = await tx.chapterVersion.findFirst({
        where: { id: idValue(input.versionId), chapterId: row.id },
      });
    if (!version || !Array.isArray(version.pageManifest))
      throw new ApiError('NOT_FOUND', 'Không tìm thấy phiên bản hợp lệ.');
    const keys = version.pageManifest.map((page) =>
      page && typeof page === 'object' && !Array.isArray(page)
        ? page.storageKey
        : null,
    );
    const pages = await assetPages(tx, storyId, keys);
    await snapshotVersion(tx, actor, row, 'Trước khi khôi phục');
    const saved = await tx.chapter.update({
      where: { id: row.id },
      data: {
        status: 'draft',
        revision: { increment: 1 },
        publishAt: null,
        scheduledBy: null,
        scheduledManifest: Prisma.DbNull,
        pages: { deleteMany: {}, create: pages },
      },
      include,
    });
    await audit(tx, actor, 'chapter.restore', 'chapter', row.id);
    return chapterDto(saved);
  });
}
