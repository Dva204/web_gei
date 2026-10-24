import {
  readBrowserRecord,
  writeBrowserRecords,
} from '@/shared/lib/storage/browserDb';
import type { ComicChapterRecord } from '../types/chapter';
const key = (storyId: string, number: number) => `chapter:${storyId}:${number}`;
export const getLocalComic = (storyId: string, number: number) =>
  readBrowserRecord<ComicChapterRecord>(key(storyId, number));
export async function getPublishedComic(storyId: string, number: number) {
  const snapshot = await readBrowserRecord<ComicChapterRecord>(
    `published:${storyId}:${number}`,
  );
  if (snapshot) return snapshot;
  const chapter = await getLocalComic(storyId, number);
  return chapter?.status === 'published' ? chapter : undefined;
}
export const getPublishedComics = (storyId: string) =>
  readBrowserRecord<number[]>(`chapters:${storyId}`).then((numbers) =>
    Promise.all(
      (numbers || []).map((number) => getPublishedComic(storyId, number)),
    ).then((items) =>
      items.filter((item): item is ComicChapterRecord => Boolean(item)),
    ),
  );
export const getPublishedChapterNumbers = async (
  storyId: string,
): Promise<number[]> => {
  const numbers = await readBrowserRecord<number[]>(
    `published-chapters:${storyId}`,
  );
  if (numbers) return numbers;
  // Migrate the first FE snapshot only once. Subsequent reads load a tiny index,
  // not every base64 image in the story, especially important on phones.
  const published = await getPublishedComics(storyId);
  const result = published
    .map((chapter) => chapter.number)
    .sort((a, b) => a - b);
  await writeBrowserRecords([], true, {
    key: `published-chapters:${storyId}`,
    numbers: result,
  });
  return result;
};
export const getLocalComics = (storyId: string) =>
  readBrowserRecord<number[]>(`chapters:${storyId}`).then((numbers) =>
    Promise.all(
      (numbers || []).map((number) => getLocalComic(storyId, number)),
    ).then((items) =>
      items.filter((item): item is ComicChapterRecord => Boolean(item)),
    ),
  );
export async function saveLocalComics(
  chapters: ComicChapterRecord[],
  overwrite = true,
) {
  if (!chapters.length) return;
  const storyId = chapters[0].storyId;
  if (
    chapters.some(
      (chapter) =>
        chapter.storyId !== storyId ||
        !Number.isSafeInteger(chapter.number) ||
        chapter.number < 1 ||
        !chapter.pages.length,
    )
  )
    throw new Error('Mỗi chap cần số hợp lệ và ít nhất một ảnh.');
  if (
    new Set(chapters.map((chapter) => chapter.number)).size !== chapters.length
  )
    throw new Error('Có số chap bị trùng.');
  const records = chapters.map((chapter) => ({
    key: key(storyId, chapter.number),
    value: chapter,
  }));
  records.push(
    ...chapters
      .filter((chapter) => chapter.status === 'published')
      .map((chapter) => ({
        key: `published:${storyId}:${chapter.number}`,
        value: chapter,
      })),
  );
  await writeBrowserRecords(records, overwrite, [
    {
      key: `chapters:${storyId}`,
      numbers: chapters.map((chapter) => chapter.number),
    },
    {
      key: `published-chapters:${storyId}`,
      numbers: chapters
        .filter((chapter) => chapter.status === 'published')
        .map((chapter) => chapter.number),
    },
  ]);
}
