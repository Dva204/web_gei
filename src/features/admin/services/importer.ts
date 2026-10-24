import { adminApi } from './http';
import type { ComicPage } from '@/features/catalog/types/chapter';
export type ImportRow = {
  number: number;
  pages: ComicPage[];
  selected: boolean;
  warnings: string[];
};
export type ImageImportPreview = {
  id: string;
  expiresAt: string;
  chapters: ImportRow[];
  warnings: string[];
};
export const previewImageImport = (
  storyId: string,
  chapters: { number: number; pages: ComicPage[] }[],
) =>
  adminApi<ImageImportPreview>(
    '/api/admin/stories/' + encodeURIComponent(storyId) + '/imports/preview',
    'POST',
    {
      chapters: chapters.map((row) => ({
        number: row.number,
        pageKeys: row.pages.map((page) => page.storageKey),
      })),
    },
  );
export const commitImageImport = (
  storyId: string,
  jobId: string,
  numbers: number[],
  targetStatus: 'draft' | 'ready',
) =>
  adminApi<{ created: number; alreadyCommitted: boolean }>(
    '/api/admin/stories/' + encodeURIComponent(storyId) + '/imports/commit',
    'POST',
    { jobId, numbers, targetStatus },
  );
