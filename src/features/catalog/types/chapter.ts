export type ChapterMeta = {
  storyId: string;
  number: number;
  title: string;
  updatedAt: string;
};
export type ComicPage = {
  assetId?: string;
  storageKey?: string;
  id: string;
  image: string;
  width: number;
  height: number;
  alt: string;
};
export type Chapter = ChapterMeta & { content: string; pages: ComicPage[] };
export type ComicChapterStatus =
  | 'draft'
  | 'translating'
  | 'editing'
  | 'beta'
  | 'ready'
  | 'published'
  | 'scheduled';
export type ComicChapterRecord = {
  storyId: string;
  number: number;
  pages: ComicPage[];
  status: ComicChapterStatus;
  updatedAt: string;
  publishAt?: string;
};
