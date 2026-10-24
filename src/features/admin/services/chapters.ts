import type { ChapterAdmin, ChapterVersion, Paginated } from '../types';
import type { ComicPage } from '@/features/catalog/types/chapter';
import { adminApi, queryString } from './http';
const base = (storyId: string) =>
  '/api/admin/stories/' + encodeURIComponent(storyId) + '/chapters';
export const listChaptersAdmin = (
  storyId: string,
  query: { status?: string; page?: number; pageSize?: number } = {},
) =>
  adminApi<Paginated<ChapterAdmin> & { nextNumber: number }>(
    base(storyId) + queryString(query),
  );
export const getChapterAdmin = (storyId: string, number: number) =>
  adminApi<ChapterAdmin>(base(storyId) + '/' + number);
export const saveChapter = (chapter: ChapterAdmin) =>
  adminApi<ChapterAdmin>(
    base(chapter.storyId) + (chapter.id ? '/' + chapter.number : ''),
    chapter.id ? 'PUT' : 'POST',
    {
      title: chapter.title || '',
      status: ['published', 'scheduled'].includes(chapter.status)
        ? 'draft'
        : chapter.status,
      pageKeys: (chapter.pages || []).map((page) => page.storageKey),
      ...(chapter.id
        ? { revision: chapter.revision }
        : { number: chapter.number }),
    },
  );
export const publicationAction = (
  chapter: ChapterAdmin,
  action: 'publish' | 'unpublish' | 'schedule' | 'cancel',
  publishAt?: string,
) =>
  adminApi<ChapterAdmin>(
    base(chapter.storyId) + '/' + chapter.number + '/publication',
    'POST',
    { action, revision: chapter.revision, ...(publishAt ? { publishAt } : {}) },
  );
export const deleteChapter = (chapter: ChapterAdmin) =>
  adminApi(base(chapter.storyId) + '/' + chapter.number, 'DELETE', {
    revision: chapter.revision,
  });
export const listVersions = (storyId: string, number: number) =>
  adminApi<ChapterVersion[]>(base(storyId) + '/' + number + '/versions');
export const restoreVersion = (chapter: ChapterAdmin, versionId: string) =>
  adminApi<ChapterAdmin>(
    base(chapter.storyId) + '/' + chapter.number + '/versions',
    'POST',
    { versionId, revision: chapter.revision },
  );
export async function uploadComicImages(
  storyId: string,
  files: File[],
  kind: 'comic' | 'covers' = 'comic',
): Promise<ComicPage[]> {
  if (
    files.length > 600 ||
    files.reduce((sum, file) => sum + file.size, 0) > 100 * 1024 * 1024
  )
    throw new Error('Mỗi lần chọn tối đa 600 ảnh và 100 MB.');
  for (const file of files)
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      !file.size ||
      file.size > 10 * 1024 * 1024
    )
      throw new Error(file.name + ': chỉ nhận PNG/JPG/WebP, tối đa 10 MB/ảnh.');
  const sorted = [...files].sort((a, b) =>
      a.name.localeCompare(b.name, 'vi', { numeric: true }),
    ),
    result: ComicPage[] = [];
  for (
    let index = 0;
    index < sorted.length;
    index += kind === 'covers' ? 1 : 2
  ) {
    const form = new FormData();
    form.set('kind', kind);
    sorted
      .slice(index, index + (kind === 'covers' ? 1 : 2))
      .forEach((file) => form.append('files', file));
    const response = await fetch(
      '/api/admin/stories/' + encodeURIComponent(storyId) + '/media',
      { method: 'POST', credentials: 'same-origin', body: form },
    );
    const body = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(body?.data))
      throw new Error(
        body?.error?.message ||
          'Upload chưa hoàn tất. Các ảnh đã upload trước đó vẫn được giữ trên máy chủ.',
      );
    result.push(...body.data);
  }
  return result;
}
