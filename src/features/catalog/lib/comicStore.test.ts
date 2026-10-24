import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getLocalComic,
  getLocalComics,
  getPublishedComic,
  getPublishedChapterNumbers,
  saveLocalComics,
} from './comicStore';
import type { ComicChapterRecord } from '../types/chapter';
import {
  readBrowserRecord,
  writeBrowserRecords,
} from '@/shared/lib/storage/browserDb';
const chapter = (
  number: number,
  status: ComicChapterRecord['status'] = 'draft',
): ComicChapterRecord => ({
  storyId: 'story',
  number,
  status,
  updatedAt: '2026-10-03',
  pages: [
    {
      id: 'p' + number,
      image: '/comic/panel-1.svg',
      width: 900,
      height: 1280,
      alt: 'Ảnh mẫu',
    },
  ],
});
beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('localStorage', { setItem: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());
describe('atomic FE comic storage', () => {
  it('aborts earlier writes when a later record cannot be cloned', async () => {
    await expect(
      writeBrowserRecords([
        { key: 'first', value: 'valid' },
        { key: 'second', value: () => undefined },
      ]),
    ).rejects.toThrow('Không thể lưu');
    expect(await readBrowserRecord('first')).toBeUndefined();
  });
  it('persists chapters and a sorted index', async () => {
    await saveLocalComics([chapter(2), chapter(1)]);
    expect((await getLocalComics('story')).map((item) => item.number)).toEqual([
      1, 2,
    ]);
    expect((await getLocalComic('story', 2))?.pages).toHaveLength(1);
  });
  it('rolls back the entire import when one chapter already exists', async () => {
    await saveLocalComics([chapter(2)]);
    await expect(
      saveLocalComics([chapter(1), chapter(2), chapter(3)], false),
    ).rejects.toThrow('đã tồn tại');
    expect(await getLocalComic('story', 1)).toBeUndefined();
    expect(await getLocalComic('story', 3)).toBeUndefined();
    expect((await getLocalComics('story')).map((item) => item.number)).toEqual([
      2,
    ]);
  });
  it('keeps the published image snapshot while saving further drafts', async () => {
    await saveLocalComics([chapter(1, 'published')]);
    const draft = chapter(1);
    draft.pages = [{ ...draft.pages[0], image: '/comic/panel-2.svg' }];
    await saveLocalComics([draft]);
    expect((await getLocalComic('story', 1))?.pages[0].image).toBe(
      '/comic/panel-2.svg',
    );
    expect((await getPublishedComic('story', 1))?.pages[0].image).toBe(
      '/comic/panel-1.svg',
    );
    expect(await getPublishedComic('story', 2)).toBeUndefined();
    expect(await getPublishedChapterNumbers('story')).toEqual([1]);
  });
  it('merges concurrent chapter writes without dropping index entries', async () => {
    await Promise.all([
      saveLocalComics([chapter(1)]),
      saveLocalComics([chapter(2)]),
      saveLocalComics([chapter(3)]),
    ]);
    expect((await getLocalComics('story')).map((item) => item.number)).toEqual([
      1, 2, 3,
    ]);
  });
  it('validates numbers, duplicates and empty page arrays before writing', async () => {
    await expect(saveLocalComics([chapter(0)])).rejects.toThrow('số hợp lệ');
    await expect(
      saveLocalComics([{ ...chapter(1), pages: [] }]),
    ).rejects.toThrow('ít nhất');
    await expect(saveLocalComics([chapter(1), chapter(1)])).rejects.toThrow(
      'trùng',
    );
    expect(await getLocalComics('story')).toEqual([]);
  });
  it('notifies same-tab readers only after successful commit', async () => {
    const listener = vi.fn();
    window.addEventListener('vuon-comics-change', listener);
    await saveLocalComics([chapter(1)], false);
    await expect(saveLocalComics([chapter(1)], false)).rejects.toThrow();
    expect(listener).toHaveBeenCalledOnce();
  });
  it('reports unsupported storage without silently dropping data', async () => {
    vi.stubGlobal('indexedDB', undefined);
    await expect(saveLocalComics([chapter(1)])).rejects.toThrow('không hỗ trợ');
  });
  it('keeps the published number index separate from unposted drafts', async () => {
    await saveLocalComics([
      chapter(1),
      chapter(2, 'ready'),
      chapter(3, 'published'),
    ]);
    expect(await getPublishedChapterNumbers('story')).toEqual([3]);
    await saveLocalComics([chapter(4, 'published')]);
    expect(await getPublishedChapterNumbers('story')).toEqual([3, 4]);
  });
});
