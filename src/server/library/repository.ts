import 'server-only';
import { prisma } from '../db/prisma';
import { ApiError } from '../http/errors';
import { publicStoryDto, storyRelations } from '../catalog/stories';
import { publicWhere } from '../catalog/public';
import { exact, idValue } from '../catalog/input';
import type { SessionUser } from '@/shared/lib/auth/types';

const historyDto = (row: Awaited<ReturnType<typeof historyRows>>[number]) => ({
  storyId: row.storyId,
  slug: row.story.slug,
  chapter: row.chapter,
  scrollRatio: row.scrollRatio,
  updatedAt: row.updatedAt.toISOString(),
  story: publicStoryDto(row.story),
});
const historyRows = (userId: string) =>
  prisma.readingHistory.findMany({
    where: { userId, story: publicWhere() },
    include: { story: { include: storyRelations } },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
export async function library(user: SessionUser) {
  const [bookmarks, history] = await Promise.all([
    prisma.bookmark.findMany({
      where: { userId: user.id, story: publicWhere() },
      include: { story: { include: storyRelations } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    historyRows(user.id),
  ]);
  return {
    bookmarks: bookmarks.map((row) => ({
      storyId: row.storyId,
      createdAt: row.createdAt.toISOString(),
      story: publicStoryDto(row.story),
    })),
    history: history.map(historyDto),
  };
}
async function publicStory(storyId: unknown) {
  const id = idValue(storyId);
  const story = await prisma.story.findFirst({
    where: { id, ...publicWhere() },
    select: { id: true },
  });
  if (!story)
    throw new ApiError(
      'NOT_FOUND',
      'Truyện không còn công khai hoặc chưa có chap đã đăng.',
    );
  return story.id;
}
export async function setBookmark(
  user: SessionUser,
  storyId: unknown,
  saved: boolean,
) {
  const id = idValue(storyId);
  if (saved) {
    await publicStory(id);
    await prisma.bookmark.upsert({
      where: { userId_storyId: { userId: user.id, storyId: id } },
      create: { userId: user.id, storyId: id },
      update: {},
    });
  } else {
    await prisma.bookmark.deleteMany({
      where: { userId: user.id, storyId: id },
    });
  }
  return { storyId: id, saved };
}
function progressInput(input: Record<string, unknown>) {
  exact(input, ['chapter', 'scrollRatio']);
  if (
    !Number.isSafeInteger(input.chapter) ||
    Number(input.chapter) < 1 ||
    Number(input.chapter) > 1_000_000
  )
    throw new ApiError('INVALID_REQUEST', 'Số chap không hợp lệ.');
  if (
    typeof input.scrollRatio !== 'number' ||
    !Number.isFinite(input.scrollRatio) ||
    input.scrollRatio < 0 ||
    input.scrollRatio > 1
  )
    throw new ApiError('INVALID_REQUEST', 'Tiến độ đọc phải từ 0 đến 1.');
  return { chapter: Number(input.chapter), scrollRatio: input.scrollRatio };
}
export async function setProgress(
  user: SessionUser,
  storyId: unknown,
  input: Record<string, unknown>,
) {
  const id = await publicStory(storyId),
    value = progressInput(input);
  const chapter = await prisma.chapter.findFirst({
    where: {
      storyId: id,
      number: value.chapter,
      deletedAt: null,
      publication: { isNot: null },
    },
    select: { id: true },
  });
  if (!chapter)
    throw new ApiError('NOT_FOUND', 'Chap không còn được xuất bản.');
  const row = await prisma.readingHistory.upsert({
    where: { userId_storyId: { userId: user.id, storyId: id } },
    create: { userId: user.id, storyId: id, ...value },
    update: value,
  });
  return {
    storyId: id,
    chapter: row.chapter,
    scrollRatio: row.scrollRatio,
    updatedAt: row.updatedAt.toISOString(),
  };
}
export async function removeProgress(user: SessionUser, storyId: unknown) {
  const id = idValue(storyId);
  await prisma.readingHistory.deleteMany({
    where: { userId: user.id, storyId: id },
  });
  return { storyId: id, removed: true };
}
export async function clearLibrary(
  user: SessionUser,
  input: Record<string, unknown>,
) {
  exact(input, ['kind']);
  if (input.kind === 'bookmarks')
    return {
      removed: (
        await prisma.bookmark.deleteMany({ where: { userId: user.id } })
      ).count,
    };
  if (input.kind === 'history')
    return {
      removed: (
        await prisma.readingHistory.deleteMany({ where: { userId: user.id } })
      ).count,
    };
  throw new ApiError('INVALID_REQUEST', 'Loại dữ liệu cần xóa không hợp lệ.');
}
type ImportedHistory = {
  storyId: string;
  chapter: number;
  scrollRatio: number;
};
export async function importLibrary(
  user: SessionUser,
  input: Record<string, unknown>,
) {
  exact(input, ['bookmarks', 'history']);
  if (
    !Array.isArray(input.bookmarks) ||
    input.bookmarks.length > 200 ||
    input.bookmarks.some((id) => typeof id !== 'string')
  )
    throw new ApiError('INVALID_REQUEST', 'Tủ truyện nhập tối đa 200 mục.');
  if (!Array.isArray(input.history) || input.history.length > 200)
    throw new ApiError('INVALID_REQUEST', 'Lịch sử nhập tối đa 200 mục.');
  const bookmarkIds = [...new Set(input.bookmarks as string[])].map(idValue);
  const history = (input.history as unknown[]).map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item))
      throw new ApiError('INVALID_REQUEST', 'Lịch sử nhập không hợp lệ.');
    const row = item as Record<string, unknown>;
    exact(row, ['storyId', 'slug', 'chapter', 'scrollRatio', 'updatedAt']);
    return {
      storyId: idValue(row.storyId),
      ...progressInput({
        chapter: row.chapter,
        scrollRatio: row.scrollRatio,
      }),
    };
  });
  const ids = [
    ...new Set([...bookmarkIds, ...history.map((row) => row.storyId)]),
  ];
  const stories = await prisma.story.findMany({
    where: { id: { in: ids }, ...publicWhere() },
    select: { id: true },
  });
  const allowed = new Set(stories.map((row) => row.id));
  const validBookmarks = bookmarkIds.filter((id) => allowed.has(id));
  const validHistory: ImportedHistory[] = [];
  for (const row of history) {
    if (!allowed.has(row.storyId)) continue;
    const chapter = await prisma.chapter.findFirst({
      where: {
        storyId: row.storyId,
        number: row.chapter,
        deletedAt: null,
        publication: { isNot: null },
      },
      select: { id: true },
    });
    if (chapter) validHistory.push(row);
  }
  return prisma.$transaction(async (tx) => {
    for (const storyId of validBookmarks)
      await tx.bookmark.upsert({
        where: { userId_storyId: { userId: user.id, storyId } },
        create: { userId: user.id, storyId },
        update: {},
      });
    for (const row of validHistory) {
      const current = await tx.readingHistory.findUnique({
        where: { userId_storyId: { userId: user.id, storyId: row.storyId } },
      });
      const takeIncoming =
        !current ||
        row.chapter > current.chapter ||
        (row.chapter === current.chapter &&
          row.scrollRatio > current.scrollRatio);
      if (takeIncoming)
        await tx.readingHistory.upsert({
          where: { userId_storyId: { userId: user.id, storyId: row.storyId } },
          create: { userId: user.id, ...row },
          update: { chapter: row.chapter, scrollRatio: row.scrollRatio },
        });
    }
    return {
      bookmarks: validBookmarks.length,
      history: validHistory.length,
      skipped: ids.length - allowed.size,
    };
  });
}
