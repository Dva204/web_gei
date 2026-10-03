import type { Paginated, Status, Story } from '@/features/catalog/types/story';
import { stories } from '@/features/catalog/mocks/stories';
import { normalizeVi } from '@/shared/lib/utils/normalizeVi';
export const DATA_SOURCE = 'mock' as const;
const delay = () =>
  process.env.NODE_ENV === 'development'
    ? new Promise((r) => setTimeout(r, 60))
    : Promise.resolve();
export async function listStories(
  opts: {
    genre?: string;
    status?: Status;
    sort?: 'updated' | 'views' | 'rating' | 'new';
    page?: number;
    pageSize?: number;
    minChapters?: number;
    maxChapters?: number;
  } = {},
): Promise<Paginated<Story>> {
  await delay();
  let a = stories.filter(
    (s) =>
      (!opts.genre || s.genres.includes(opts.genre)) &&
      (!opts.status || s.status === opts.status) &&
      (!opts.minChapters || s.totalChapters >= opts.minChapters) &&
      (!opts.maxChapters || s.totalChapters <= opts.maxChapters),
  );
  a = [...a].sort((x, y) =>
    opts.sort === 'views'
      ? y.views - x.views
      : opts.sort === 'rating'
        ? y.rating - x.rating
        : opts.sort === 'new'
          ? +new Date(y.createdAt) - +new Date(x.createdAt)
          : +new Date(y.updatedAt) - +new Date(x.updatedAt),
  );
  const page = Math.max(1, opts.page || 1),
    pageSize = opts.pageSize || 12;
  return {
    items: a.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: a.length,
    totalPages: Math.ceil(a.length / pageSize),
  };
}
export async function getStoryBySlug(slug: string) {
  await delay();
  return stories.find((s) => s.slug === slug) || null;
}
export async function searchStories(
  q: string,
  page = 1,
): Promise<Paginated<Story>> {
  await delay();
  const n = normalizeVi(q),
    items = stories.filter((s) =>
      normalizeVi(`${s.title} ${s.author}`).includes(n),
    );
  const pageSize = 12;
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: items.length,
    totalPages: Math.ceil(items.length / pageSize),
  };
}
export async function getRelatedStories(slug: string) {
  const story = await getStoryBySlug(slug);
  if (!story) return [];
  return stories
    .filter(
      (s) => s.slug !== slug && s.genres.some((g) => story.genres.includes(g)),
    )
    .slice(0, 8);
}
