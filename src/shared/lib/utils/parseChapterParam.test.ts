import { describe, expect, it } from 'vitest';
import { parseChapterParam } from './parseChapterParam';
describe('parseChapterParam', () => {
  it('parses valid chapter', () =>
    expect(parseChapterParam('chap-12')).toBe(12));
  it('rejects invalid params', () =>
    expect(parseChapterParam('12')).toBeNull());
});
