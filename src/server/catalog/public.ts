import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { ApiError } from '../http/errors';
import { publicStoryDto, storyRelations } from './stories';
import { enumValue, invalid, text } from './input';
import { normalizeVi } from '@/shared/lib/utils/normalizeVi';
import { publishedMediaUrl } from '../media/storage';
import type { Paginated, Story } from '@/features/catalog/types/story';
import type { ChapterMeta, ComicPage } from '@/features/catalog/types/chapter';

export type CatalogQuery = {
  genre?: string;
  status?: Story['status'];
  ending?: Story['ending'];
  sort?: 'updated' | 'views' | 'rating' | 'new';
  page?: number;
  pageSize?: number;
  minChapters?: number;
  maxChapters?: number;
  search?: string;
  excludeSlug?: string;
};
export function publicWhere(): Prisma.StoryWhereInput {
  return {
    deletedAt: null,
    visibility: 'public',
    rightsType: { not: null },
    AND: [
      {
        OR: [
          { rightsType: 'own' },
          { rightsNote: { not: null }, NOT: { rightsNote: '' } },
        ],
      },
      {
        OR: [
          { rightsExpiresAt: null },
          { rightsExpiresAt: { gt: new Date() } },
        ],
      },
    ],
    chapters: { some: { deletedAt: null, publication: { isNot: null } } },
  };
}
const positive = (value: number | undefined, fallback: number, max: number) =>
  Number.isSafeInteger(value) && Number(value) > 0
    ? Math.min(Number(value), max)
    : fallback;
export async function listPublicStories(
  options: CatalogQuery = {},
): Promise<Paginated<Story>> {
  const pageSize = positive(options.pageSize, 12, 100),
    requestedPage = positive(options.page, 1, 1_000_000);
  const clauses: Prisma.Sql[] = [
    Prisma.sql`s."deletedAt" IS NULL AND s."visibility" = 'public' AND s."rightsType" IS NOT NULL
    AND (s."rightsType" = 'own' OR length(btrim(coalesce(s."rightsNote", ''))) > 0)
    AND (s."rightsExpiresAt" IS NULL OR s."rightsExpiresAt" > CURRENT_TIMESTAMP)`,
  ];
  if (options.status)
    clauses.push(
      Prisma.sql`s."status"::text = ${enumValue(options.status, ['ongoing', 'full', 'paused'], 'Trạng thái')}`,
    );
  if (options.ending)
    clauses.push(
      Prisma.sql`s."ending"::text = ${enumValue(options.ending, ['HE', 'SE', 'OE'], 'Kết thúc')}`,
    );
  if (options.genre)
    clauses.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "StoryGenre" sg JOIN "Genre" g ON g."id" = sg."genreId" WHERE sg."storyId" = s."id" AND g."slug" = ${text(options.genre, 'Thể loại', 120)} AND g."deletedAt" IS NULL)`,
    );
  if (options.excludeSlug)
    clauses.push(Prisma.sql`s."slug" <> ${options.excludeSlug}`);
  if (options.search) {
    const search = normalizeVi(text(options.search, 'Tìm kiếm', 200));
    clauses.push(
      Prisma.sql`(position(${search} in s."searchTitle") > 0 OR EXISTS (SELECT 1 FROM "Author" a WHERE a."id" = s."authorId" AND a."deletedAt" IS NULL AND position(${search} in a."searchName") > 0))`,
    );
  }
  for (const key of ['minChapters', 'maxChapters'] as const)
    if (
      options[key] !== undefined &&
      (!Number.isSafeInteger(options[key]) ||
        Number(options[key]) < 0 ||
        Number(options[key]) > 1_000_000)
    )
      invalid('Khoảng số chap không hợp lệ.');
  if (options.minChapters)
    clauses.push(Prisma.sql`pc.total >= ${options.minChapters}`);
  if (options.maxChapters !== undefined)
    clauses.push(Prisma.sql`pc.total <= ${options.maxChapters}`);
  const source = Prisma.sql`FROM "Story" s JOIN (SELECT c."storyId", count(*)::int AS total FROM "Chapter" c JOIN "ChapterPublication" p ON p."chapterId" = c."id" WHERE c."deletedAt" IS NULL GROUP BY c."storyId") pc ON pc."storyId" = s."id" WHERE ${Prisma.join(clauses, ' AND ')}`;
  const counts = await prisma.$queryRaw<{ total: number }[]>(
    Prisma.sql`SELECT count(*)::int AS total ${source}`,
  );
  const total = counts[0].total,
    totalPages = Math.ceil(total / pageSize),
    page = Math.min(requestedPage, Math.max(1, totalPages));
  const sort = enumValue(
    options.sort || 'updated',
    ['updated', 'views', 'rating', 'new'] as const,
    'Sắp xếp',
  );
  const order = {
    updated: Prisma.sql`s."updatedAt" DESC`,
    views: Prisma.sql`s."views" DESC`,
    rating: Prisma.sql`s."rating" DESC`,
    new: Prisma.sql`s."createdAt" DESC`,
  }[sort];
  const ids = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT s."id" ${source} ORDER BY ${order}, s."id" ASC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
  );
  const rows = ids.length
    ? await prisma.story.findMany({
        where: { ...publicWhere(), id: { in: ids.map((item) => item.id) } },
        include: storyRelations,
      })
    : [];
  const byId = new Map(rows.map((row) => [row.id, publicStoryDto(row)]));
  return {
    items: ids.flatMap((item) =>
      byId.has(item.id) ? [byId.get(item.id)!] : [],
    ),
    page,
    pageSize,
    total,
    totalPages,
  };
}
export async function getPublicStory(slug: string) {
  if (slug.length > 120) return null;
  const row = await prisma.story.findFirst({
    where: { ...publicWhere(), slug },
    include: storyRelations,
  });
  if (!row || (row.rightsType !== 'own' && !row.rightsNote?.trim()))
    return null;
  return publicStoryDto(row);
}
export async function publicGenres() {
  return prisma.genre.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    select: { slug: true, name: true, description: true },
  });
}
export async function publicGenre(slug: string) {
  return prisma.genre.findFirst({
    where: { slug, deletedAt: null },
    select: { slug: true, name: true, description: true },
  });
}
export async function listPublicChapters(
  slug: string,
  requestedPage: number,
  requestedSize = 50,
): Promise<Paginated<ChapterMeta>> {
  const story = await getPublicStory(slug);
  const pageSize = positive(requestedSize, 50, 100),
    page = Math.min(
      positive(requestedPage, 1, 1_000_000),
      Math.max(1, Math.ceil((story?.totalChapters || 0) / pageSize)),
    );
  if (!story) return { items: [], page, pageSize, total: 0, totalPages: 0 };
  const rows = await prisma.chapter.findMany({
    where: {
      storyId: story.id,
      deletedAt: null,
      publication: { isNot: null },
    },
    orderBy: { number: 'asc' },
    take: pageSize,
    skip: (page - 1) * pageSize,
    select: { number: true, publication: { select: { publishedAt: true } } },
  });
  return {
    items: rows.map((row) => ({
      storyId: story.id,
      number: row.number,
      title: '',
      updatedAt: row.publication!.publishedAt.toISOString(),
    })),
    page,
    pageSize,
    total: story.totalChapters,
    totalPages: Math.ceil(story.totalChapters / pageSize),
  };
}
function publishedPages(
  manifest: Prisma.JsonValue,
  chapterId: string,
): ComicPage[] {
  if (!Array.isArray(manifest) || !manifest.length || manifest.length > 300)
    throw new ApiError(
      'SERVICE_UNAVAILABLE',
      'Snapshot ảnh của chap không hợp lệ.',
    );
  return manifest.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry))
      throw new ApiError('SERVICE_UNAVAILABLE', 'Snapshot ảnh không hợp lệ.');
    const { storageKey, width, height, pageNumber, alt } = entry;
    if (
      typeof storageKey !== 'string' ||
      !/^comic\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/.test(
        storageKey,
      ) ||
      !Number.isSafeInteger(width) ||
      !Number.isSafeInteger(height) ||
      Number(width) < 1 ||
      Number(height) < 1 ||
      pageNumber !== index + 1
    )
      throw new ApiError('SERVICE_UNAVAILABLE', 'Snapshot ảnh không hợp lệ.');
    return {
      id: `${chapterId}-${index + 1}`,
      image: publishedMediaUrl(storageKey),
      width: Number(width),
      height: Number(height),
      alt: typeof alt === 'string' ? alt.slice(0, 500) : `Trang ${index + 1}`,
    };
  });
}
export async function getPublicChapter(slug: string, number: number) {
  if (!Number.isSafeInteger(number) || number < 1) return null;
  const story = await getPublicStory(slug);
  if (!story) return null;
  const where = {
    storyId: story.id,
    deletedAt: null,
    publication: { isNot: null },
  };
  const row = await prisma.chapter.findFirst({
    where: { ...where, number },
    select: {
      id: true,
      number: true,
      publication: { select: { pageManifest: true, publishedAt: true } },
    },
  });
  if (!row?.publication) return null;
  const numbers = (
    await prisma.chapter.findMany({
      where,
      orderBy: { number: 'asc' },
      select: { number: true },
    })
  ).map((item) => item.number);
  const index = numbers.indexOf(number);
  return {
    chapter: {
      storyId: story.id,
      number,
      title: '',
      content: '',
      updatedAt: row.publication.publishedAt.toISOString(),
      pages: publishedPages(row.publication.pageManifest, row.id),
    },
    prev: numbers[index - 1] ?? null,
    next: numbers[index + 1] ?? null,
    publishedNumbers: numbers,
  };
}
