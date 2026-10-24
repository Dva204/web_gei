import { describe, expect, it } from 'vitest';
import {
  IMAGE_LIMIT,
  imageFileError,
  movePage,
  naturalFiles,
} from './comicImages';
import { chapterNumberFromPath, importWarnings } from './importImages';
describe('comic image import validation', () => {
  it('allows common bitmap files and rejects SVG, empty or oversized files', () => {
    expect(
      imageFileError({ name: '1.png', type: 'image/png', size: 10 }),
    ).toBeNull();
    expect(
      imageFileError({ name: '1.webp', type: 'image/webp', size: IMAGE_LIMIT }),
    ).toBeNull();
    expect(
      imageFileError({ name: '1.svg', type: 'image/svg+xml', size: 10 }),
    ).toContain('chỉ nhận');
    expect(
      imageFileError({ name: '1.jpg', type: 'image/jpeg', size: 0 }),
    ).not.toBeNull();
    expect(
      imageFileError({
        name: '1.jpg',
        type: 'image/jpeg',
        size: IMAGE_LIMIT + 1,
      }),
    ).not.toBeNull();
  });
  it('naturally sorts files without mutating the picker order', () => {
    const files = ['10.jpg', '2.jpg', '1.jpg'].map(
      (name) => ({ name }) as File,
    );
    expect(naturalFiles(files).map((file) => file.name)).toEqual([
      '1.jpg',
      '2.jpg',
      '10.jpg',
    ]);
    expect(files[0].name).toBe('10.jpg');
  });
  it('moves pages immutably and refuses out-of-range targets', () => {
    const pages = ['a', 'b', 'c'];
    expect(movePage(pages, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(pages).toEqual(['a', 'b', 'c']);
    expect(movePage(pages, -1, 2)).toBe(pages);
    expect(movePage(pages, 1, 9)).toBe(pages);
  });
  it('extracts chap numbers from filenames and folder paths', () => {
    expect(chapterNumberFromPath('chap-7_001.jpg')).toBe(7);
    expect(chapterNumberFromPath('upload/Chap 12/001.png')).toBe(12);
    expect(chapterNumberFromPath('upload\\chap-8\\002.png')).toBe(8);
    expect(chapterNumberFromPath('chapter-4_1.jpg')).toBeNull();
    expect(chapterNumberFromPath('chap-0_1.jpg')).toBeNull();
    expect(chapterNumberFromPath('001.jpg')).toBeNull();
  });
  it('blocks duplicate, invalid and existing chapter numbers', () => {
    expect(importWarnings([7, 8], [1, 2])).toEqual([]);
    expect(importWarnings([7, 7], [])).not.toHaveLength(0);
    expect(importWarnings([0, 1.5, NaN], [])).not.toHaveLength(0);
    expect(importWarnings([7], [7])).not.toHaveLength(0);
  });
});
