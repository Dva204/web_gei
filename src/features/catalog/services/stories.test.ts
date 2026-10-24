import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/server/catalog/public', () => ({
  listPublicStories: vi.fn(),
  getPublicStory: vi.fn(),
}));
import { listPublicStories, getPublicStory } from '@/server/catalog/public';
import {
  DATA_SOURCE,
  getRelatedStories,
  listStories,
  searchStories,
} from './stories';
describe('catalog database adapter', () => {
  beforeEach(() => vi.resetAllMocks());
  it('forwards pagination/search/filter options to the DB repository', async () => {
    const result = {
      items: [],
      page: 1,
      pageSize: 12,
      total: 0,
      totalPages: 0,
    };
    vi.mocked(listPublicStories).mockResolvedValue(result);
    expect(DATA_SOURCE).toBe('database');
    expect(await listStories({ page: 3, status: 'full' })).toBe(result);
    expect(listPublicStories).toHaveBeenCalledWith({ page: 3, status: 'full' });
    await searchStories('lam mien', 2, { minChapters: 50, genre: 'hien-dai' });
    expect(listPublicStories).toHaveBeenLastCalledWith({
      search: 'lam mien',
      page: 2,
      minChapters: 50,
      genre: 'hien-dai',
    });
  });
  it('does not silently fall back to mock data when DB fails', async () => {
    vi.mocked(listPublicStories).mockRejectedValue(
      new Error('Database unavailable'),
    );
    await expect(listStories()).rejects.toThrow('Database unavailable');
  });
  it('does not return related stories for an inaccessible story', async () => {
    vi.mocked(getPublicStory).mockResolvedValue(null);
    expect(await getRelatedStories('hidden')).toEqual([]);
    expect(listPublicStories).not.toHaveBeenCalled();
  });
});
