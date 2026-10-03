export type ChapterMeta = {
  storyId: string;
  number: number;
  title: string;
  updatedAt: string;
};
export type ComicPage = {
  id: string;
  image: string;
  width: number;
  height: number;
  alt: string;
};
export type Chapter = ChapterMeta & { content: string; pages: ComicPage[] };
