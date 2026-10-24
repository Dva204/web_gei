import 'server-only';
import {
  getPublicStory,
  listPublicStories,
  type CatalogQuery,
} from '@/server/catalog/public';
export const DATA_SOURCE = 'database' as const;
export const listStories = (options: CatalogQuery = {}) =>
  listPublicStories(options);
export const getStoryBySlug = getPublicStory;
export const searchStories = (
  search: string,
  page = 1,
  filters: CatalogQuery = {},
) => listPublicStories({ ...filters, search, page });
export async function getRelatedStories(slug: string) {
  const story = await getPublicStory(slug);
  if (!story) return [];
  return (
    await listPublicStories({
      genre: story.genres[0],
      excludeSlug: slug,
      pageSize: 8,
    })
  ).items;
}
