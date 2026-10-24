import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readBookmarks,
  readHistory,
  saveProgress,
  writeLibrary,
} from './storage';
const values = new Map<string, string>();
beforeEach(() => {
  values.clear();
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());
describe('reading library storage', () => {
  it('deduplicates ids and ignores malformed bookmarks', () => {
    values.set(
      'bookmarks',
      JSON.stringify({ items: ['1', '1', 2, null, '3'] }),
    );
    expect(readBookmarks()).toEqual(['1', '3']);
    values.set('bookmarks', 'broken');
    expect(readBookmarks()).toEqual([]);
  });
  it('validates history and clamps the reading position', () => {
    values.set(
      'history',
      JSON.stringify({
        items: [
          { storyId: '1', slug: 'story', chapter: 2, scrollRatio: 8 },
          { storyId: '2', chapter: 1, scrollRatio: 0 },
          { storyId: '3', slug: 'story', chapter: 0, scrollRatio: 0 },
        ],
      }),
    );
    expect(readHistory()).toHaveLength(1);
    expect(readHistory()[0].scrollRatio).toBe(1);
  });
  it('updates progress per story and notifies same-tab consumers', () => {
    const listener = vi.fn();
    window.addEventListener('vuon-library-change', listener);
    saveProgress({
      storyId: '1',
      slug: 'story',
      chapter: 2,
      scrollRatio: 0.3,
      updatedAt: '2026-10-03',
    });
    saveProgress({
      storyId: '1',
      slug: 'story',
      chapter: 3,
      scrollRatio: 0.5,
      updatedAt: '2026-10-03',
    });
    expect(readHistory()).toHaveLength(1);
    expect(readHistory()[0].chapter).toBe(3);
    expect(listener).toHaveBeenCalledTimes(2);
  });
  it('retains stored data and reports denied writes', () => {
    writeLibrary('bookmarks', ['1']);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key),
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
    });
    expect(() => writeLibrary('bookmarks', ['2'])).toThrow('Không thể lưu');
    expect(readBookmarks()).toEqual(['1']);
  });
});
