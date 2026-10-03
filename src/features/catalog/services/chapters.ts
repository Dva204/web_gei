import type { Paginated } from '@/features/catalog/types/story';
import type { ChapterMeta, Chapter } from '@/features/catalog/types/chapter';
import { getStoryBySlug } from './stories';
import { chapterTitle } from '@/features/catalog/mocks/generators';
export async function getChaptersPage(
  slug: string,
  page: number,
  pageSize = 50,
): Promise<Paginated<ChapterMeta>> {
  const story = await getStoryBySlug(slug);
  if (!story) return { items: [], page, pageSize, total: 0, totalPages: 0 };
  const start = (page - 1) * pageSize + 1,
    items = Array.from(
      {
        length: Math.max(
          0,
          Math.min(pageSize, story.totalChapters - start + 1),
        ),
      },
      (_, i) => ({
        storyId: story.id,
        number: start + i,
        title: chapterTitle(start + i),
        updatedAt: story.updatedAt,
      }),
    );
  return {
    items,
    page,
    pageSize,
    total: story.totalChapters,
    totalPages: Math.ceil(story.totalChapters / pageSize),
  };
}
export async function getChapter(
  slug: string,
  n: number,
): Promise<{
  chapter: Chapter;
  prev: number | null;
  next: number | null;
} | null> {
  const story = await getStoryBySlug(slug);
  if (!story || n < 1 || n > story.totalChapters) return null;
  const dimensions = [
    [900, 1280],
    [900, 1050],
    [900, 1320],
    [900, 1120],
    [900, 1250],
    [900, 1180],
  ];
  const count = 12 + (n % 5);
  const pages = Array.from({ length: count }, (_, i) => {
    const panel = (i + n) % 6,
      [width, height] = dimensions[panel];
    return {
      id: `${story.id}-${n}-${i + 1}`,
      image: `/comic/panel-${panel + 1}.svg`,
      width,
      height,
      alt: `${story.title}, chapter ${n}, trang truyện ${i + 1}`,
    };
  });
  return {
    chapter: {
      storyId: story.id,
      number: n,
      title: chapterTitle(n),
      updatedAt: story.updatedAt,
      content: '',
      pages,
    },
    prev: n > 1 ? n - 1 : null,
    next: n < story.totalChapters ? n + 1 : null,
  };
}
