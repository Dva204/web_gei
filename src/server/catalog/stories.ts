import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { ApiError } from '../http/errors';
import {
  actorInTransaction,
  audit,
  grant,
  storyScope,
  transaction,
} from './common';
import {
  assertRights,
  enumValue,
  exact,
  idValue,
  pageQuery,
  revisionValue,
  storyInput,
  text,
} from './input';
import { normalizeVi } from '@/shared/lib/utils/normalizeVi';
import { mediaUrl } from '@/shared/lib/storage/media';
import {
  deletePublicMedia,
  publishedMediaUrl,
  promotePublicMedia,
  purgePublishedUrls,
} from '../media/storage';
import { promoteStoryDelivery, removeStoryDelivery } from '../media/lifecycle';
import type { Story } from '@/features/catalog/types/story';
import type { StoryAdmin } from '@/features/admin/types';
import type { SessionUser } from '@/shared/lib/auth/types';

export const storyRelations = {
  author: true,
  genres: { include: { genre: true } },
  chapters: {
    where: { deletedAt: null, publication: { isNot: null } },
    orderBy: { number: 'asc' as const },
    select: { number: true, publication: { select: { publishedAt: true } } },
  },
} satisfies Prisma.StoryInclude;
type StoryRow = Prisma.StoryGetPayload<{ include: typeof storyRelations }>;
export function publicStoryDto(row: StoryRow, published = true): Story {
  const chapters = row.chapters;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    synopsis: row.synopsis,
    cover: row.coverStorageKey
      ? published
        ? publishedMediaUrl(row.coverStorageKey)
        : mediaUrl(row.coverStorageKey)
      : undefined,
    author: row.author?.deletedAt
      ? 'Đang cập nhật'
      : row.author?.name || 'Đang cập nhật',
    genres: row.genres
      .filter((item) => !item.genre.deletedAt)
      .map((item) => item.genre.slug),
    genreLabels: Object.fromEntries(
      row.genres
        .filter((item) => !item.genre.deletedAt)
        .map((item) => [item.genre.slug, item.genre.name]),
    ),
    status: row.status,
    ending: row.ending || undefined,
    rating: Number(row.rating),
    ratingCount: row.ratingCount,
    views: Number(
      row.views > BigInt(Number.MAX_SAFE_INTEGER)
        ? BigInt(Number.MAX_SAFE_INTEGER)
        : row.views,
    ),
    totalChapters: chapters.length,
    firstChapter: chapters[0]?.number,
    latestChapter: chapters.at(-1)?.number || 0,
    recentChapters: chapters
      .slice(-2)
      .reverse()
      .map((chapter) => ({
        number: chapter.number,
        updatedAt: chapter.publication!.publishedAt.toISOString(),
      })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    seoTitle: row.seoTitle || undefined,
    seoDescription: row.seoDescription || undefined,
  };
}
function adminDto(
  row: StoryRow & { assignments: { userId: string }[] },
): StoryAdmin {
  return {
    ...publicStoryDto(row, false),
    visibility: row.visibility,
    featured: row.featured,
    authorId: row.authorId || undefined,
    genreIds: row.genres.map((item) => item.genreId),
    coverStorageKey: row.coverStorageKey || undefined,
    rightsType: row.rightsType || undefined,
    rightsNote: row.rightsNote || undefined,
    rightsExpiresAt: row.rightsExpiresAt?.toISOString(),
    assigneeIds: row.assignments.map((item) => item.userId),
    revision: row.revision,
    deletedAt: row.deletedAt?.toISOString(),
  };
}
const adminInclude = {
  ...storyRelations,
  assignments: { select: { userId: true } },
};
export async function getAdminStory(user: SessionUser, id: string) {
  const row = await prisma.story.findFirst({
    where: { id: idValue(id), ...storyScope(user) },
    include: adminInclude,
  });
  if (!row)
    throw new ApiError(
      'NOT_FOUND',
      'Không tìm thấy truyện hoặc chưa được phân công.',
    );
  return adminDto(row);
}
export async function listAdminStories(
  user: SessionUser,
  query: URLSearchParams,
) {
  const paging = pageQuery(query);
  const where: Prisma.StoryWhereInput = {
    ...storyScope(user),
    deletedAt: query.get('deleted') === 'true' ? { not: null } : null,
  };
  if (query.get('search'))
    where.searchTitle = {
      contains: normalizeVi(text(query.get('search'), 'Tìm kiếm', 200)),
    };
  if (query.get('visibility'))
    where.visibility = enumValue(
      query.get('visibility'),
      ['draft', 'hidden', 'public'] as const,
      'Hiển thị',
    );
  if (query.get('status'))
    where.status = enumValue(
      query.get('status'),
      ['ongoing', 'full', 'paused'] as const,
      'Trạng thái',
    );
  if (query.get('genre'))
    where.genres = {
      some: {
        genre: {
          slug: text(query.get('genre'), 'Thể loại', 120),
          deletedAt: null,
        },
      },
    };
  if (query.get('rights') === 'missing') where.rightsType = null;
  const total = await prisma.story.count({ where });
  const totalPages = Math.ceil(total / paging.pageSize),
    page = Math.min(paging.page, Math.max(1, totalPages));
  const rows = await prisma.story.findMany({
    where,
    include: adminInclude,
    orderBy:
      query.get('sort') === 'views'
        ? [{ views: 'desc' }, { id: 'asc' }]
        : [{ updatedAt: 'desc' }, { id: 'asc' }],
    skip: (page - 1) * paging.pageSize,
    take: paging.pageSize,
  });
  return {
    items: rows.map(adminDto),
    total,
    totalPages,
    page,
    pageSize: paging.pageSize,
  };
}
async function checkReferences(
  tx: Prisma.TransactionClient,
  authorId: string | null,
  genreIds: string[],
) {
  // Share locks serialize reference checks with taxonomy deletion.
  if (authorId) {
    await tx.$queryRaw`SELECT "id" FROM "Author" WHERE "id" = ${authorId} FOR SHARE`;
    if (
      !(await tx.author.findFirst({ where: { id: authorId, deletedAt: null } }))
    )
      throw new ApiError(
        'INVALID_REQUEST',
        'Tác giả không tồn tại hoặc đã xóa.',
      );
  }
  if (genreIds.length) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "Genre" WHERE "id" IN (${Prisma.join(genreIds)}) ORDER BY "id" FOR SHARE`,
    );
    if (
      (await tx.genre.count({
        where: { id: { in: genreIds }, deletedAt: null },
      })) !== genreIds.length
    )
      throw new ApiError(
        'INVALID_REQUEST',
        'Thể loại không tồn tại hoặc đã xóa.',
      );
  }
}
export async function saveAdminStory(
  user: SessionUser,
  input: Record<string, unknown>,
  id?: string,
) {
  const parsed = storyInput(input, Boolean(id));
  let previousCoverKey: string | null = null;
  let becameNonPublic = false;
  const saved = await transaction(async (tx) => {
    const actor = await actorInTransaction(tx, user);
    const scope = storyScope(actor, 'stories.manage');
    let existing: {
      id: string;
      revision: number;
      visibility: string;
      featured: boolean;
      coverStorageKey: string | null;
    } | null = null;
    if (id) {
      await tx.$queryRaw`SELECT "id" FROM "Story" WHERE "id" = ${idValue(id)} FOR UPDATE`;
      existing = await tx.story.findFirst({
        where: { id, deletedAt: null, ...scope },
        select: {
          id: true,
          revision: true,
          visibility: true,
          featured: true,
          coverStorageKey: true,
        },
      });
      if (!existing)
        throw new ApiError(
          'NOT_FOUND',
          'Không tìm thấy truyện hoặc không có quyền sửa.',
        );
      if (existing.revision !== parsed.revision)
        throw new ApiError(
          'CONFLICT',
          'Truyện đã được sửa ở phiên khác. Hãy tải lại trước khi lưu.',
        );
      previousCoverKey = existing.coverStorageKey;
      becameNonPublic = existing.visibility === 'public' && parsed.visibility !== 'public';
    }
    if (
      actor.role === 'author' &&
      (parsed.visibility !== 'draft' ||
        parsed.featured ||
        existing?.visibility === 'public')
    ) {
      throw new ApiError(
        'FORBIDDEN',
        'Tác giả chỉ tạo/sửa bản nháp được phân công; biên tập viên quản lý công khai và ẩn truyện.',
      );
    }
    if (
      parsed.visibility === 'public' ||
      (existing && existing.visibility !== parsed.visibility) ||
      (existing && existing.featured !== parsed.featured)
    )
      grant(actor, 'stories.publish');
    if (parsed.visibility === 'public') assertRights(parsed);
    await checkReferences(tx, parsed.authorId, parsed.genreIds);
    if (parsed.coverStorageKey && (!id || !await tx.mediaAsset.findFirst({ where: { storyId: id, kind: 'covers', storageKey: parsed.coverStorageKey }, select: { id: true } }))) {
      throw new ApiError('INVALID_REQUEST', 'Ảnh bìa phải được upload cho đúng truyện. Lưu truyện trước khi thêm bìa.');
    }
    if (parsed.visibility === 'public') {
      if (parsed.coverStorageKey) await promotePublicMedia([parsed.coverStorageKey]);
      if (id) await promoteStoryDelivery(id, tx);
    }
    const { genreIds, revision: _revision, ...data } = parsed;
    void _revision;
    const row = id
      ? await tx.story.update({
          where: { id },
          data: {
            ...data,
            revision: { increment: 1 },
            genres: {
              deleteMany: {},
              create: genreIds.map((genreId) => ({ genreId })),
            },
          },
          include: adminInclude,
        })
      : await tx.story.create({
          data: {
            ...data,
            genres: { create: genreIds.map((genreId) => ({ genreId })) },
            ...(actor.role === 'author'
              ? {
                  assignments: { create: { userId: actor.id, kind: 'author' } },
                }
              : {}),
          },
          include: adminInclude,
        });
    await audit(
      tx,
      actor,
      id ? 'story.update' : 'story.create',
      'story',
      row.id,
    );
    return adminDto(row);
  }, { maxWait: 10_000, timeout: 120_000 });
  if (becameNonPublic) await removeStoryDelivery(saved.id);
  if (previousCoverKey && previousCoverKey !== saved.coverStorageKey) {
    await deletePublicMedia([previousCoverKey]);
    await purgePublishedUrls([previousCoverKey]);
  }
  return saved;
}
export async function trashAdminStory(
  user: SessionUser,
  id: string,
  input: Record<string, unknown>,
  restore = false,
) {
  exact(input, ['revision']);
  const revision = revisionValue(input.revision);
  const saved = await transaction(async (tx) => {
    const actor = await actorInTransaction(tx, user);
    grant(actor, 'stories.publish');
    await tx.$queryRaw`SELECT "id" FROM "Story" WHERE "id" = ${idValue(id)} FOR UPDATE`;
    const row = await tx.story.findUnique({ where: { id } });
    if (!row) throw new ApiError('NOT_FOUND', 'Không tìm thấy truyện.');
    if (row.revision !== revision)
      throw new ApiError('CONFLICT', 'Dữ liệu đã thay đổi. Hãy tải lại.');
    if (Boolean(row.deletedAt) !== restore)
      throw new ApiError(
        'CONFLICT',
        restore ? 'Truyện chưa bị xóa.' : 'Truyện đã bị xóa.',
      );
    const saved = await tx.story.update({
      where: { id },
      data: {
        deletedAt: restore ? null : new Date(),
        visibility: 'hidden',
        revision: { increment: 1 },
      },
      include: adminInclude,
    });
    await audit(
      tx,
      actor,
      restore ? 'story.restore' : 'story.trash',
      'story',
      id,
    );
    return adminDto(saved);
  });
  if (!restore) await removeStoryDelivery(id);
  return saved;
}
export async function assignAdminStory(
  user: SessionUser,
  id: string,
  input: Record<string, unknown>,
) {
  exact(input, ['revision', 'assignments']);
  const revision = revisionValue(input.revision);
  if (!Array.isArray(input.assignments) || input.assignments.length > 20)
    throw new ApiError('INVALID_REQUEST', 'Tối đa 20 phân công.');
  const assignments = input.assignments.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item))
      throw new ApiError('INVALID_REQUEST', 'Phân công không hợp lệ.');
    const value = item as Record<string, unknown>;
    exact(value, ['userId', 'kind']);
    return {
      userId: idValue(value.userId),
      kind: enumValue(
        value.kind,
        ['author', 'beta'] as const,
        'Vai trò phân công',
      ),
    };
  });
  if (
    new Set(assignments.map((item) => `${item.userId}:${item.kind}`)).size !==
    assignments.length
  )
    throw new ApiError('INVALID_REQUEST', 'Phân công bị trùng.');
  return transaction(async (tx) => {
    const actor = await actorInTransaction(tx, user);
    grant(actor, 'stories.assign');
    await tx.$queryRaw`SELECT "id" FROM "Story" WHERE "id" = ${idValue(id)} FOR UPDATE`;
    const row = await tx.story.findFirst({ where: { id, deletedAt: null } });
    if (!row) throw new ApiError('NOT_FOUND', 'Không tìm thấy truyện.');
    if (row.revision !== revision)
      throw new ApiError('CONFLICT', 'Dữ liệu đã thay đổi. Hãy tải lại.');
    for (const assignment of assignments) {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${assignment.userId} FOR SHARE`;
      if (
        !(await tx.user.findFirst({
          where: {
            id: assignment.userId,
            role: assignment.kind,
            status: 'active',
          },
          select: { id: true },
        }))
      )
        throw new ApiError(
          'INVALID_REQUEST',
          'Người được phân công phải có vai trò author/beta đang hoạt động.',
        );
    }
    await tx.storyAssignment.deleteMany({ where: { storyId: id } });
    if (assignments.length)
      await tx.storyAssignment.createMany({
        data: assignments.map((item) => ({ ...item, storyId: id })),
      });
    const saved = await tx.story.update({
      where: { id },
      data: { revision: { increment: 1 } },
      include: adminInclude,
    });
    await audit(tx, actor, 'story.assign', 'story', id);
    return adminDto(saved);
  });
}
