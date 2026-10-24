import type { Paginated, StoryAdmin } from '@/features/admin/types';
import { adminApi, queryString } from './http';
export type StoryAdminQuery = {
  search?: string;
  status?: string;
  visibility?: string;
  genre?: string;
  sort?: string;
  rights?: string;
  deleted?: boolean;
  page?: number;
  pageSize?: number;
  assigneeId?: string;
};
export const listStoriesAdmin = (query: StoryAdminQuery = {}) =>
  adminApi<Paginated<StoryAdmin>>('/api/admin/stories' + queryString(query));
export const getStoryAdmin = (id: string) =>
  adminApi<StoryAdmin>('/api/admin/stories/' + encodeURIComponent(id));
export function saveStory(input: StoryAdmin) {
  const payload = {
    title: input.title,
    slug: input.slug,
    synopsis: input.synopsis,
    authorId: input.authorId || null,
    genreIds: input.genreIds || [],
    status: input.status,
    visibility: input.visibility,
    ending: input.ending || null,
    featured: input.featured,
    coverStorageKey: input.coverStorageKey || null,
    rightsType: input.rightsType || null,
    rightsNote: input.rightsNote || null,
    rightsExpiresAt: input.rightsExpiresAt || null,
    seoTitle: input.seoTitle || null,
    seoDescription: input.seoDescription || null,
    ...(input.id ? { revision: input.revision } : {}),
  };
  return adminApi<StoryAdmin>(
    '/api/admin/stories' + (input.id ? '/' + encodeURIComponent(input.id) : ''),
    input.id ? 'PUT' : 'POST',
    payload,
  );
}
export const trashStory = (story: StoryAdmin, restore = false) =>
  adminApi<StoryAdmin>(
    '/api/admin/stories/' + encodeURIComponent(story.id),
    restore ? 'PATCH' : 'DELETE',
    { revision: story.revision },
  );
