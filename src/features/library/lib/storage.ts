export type HistoryItem = {
  storyId: string;
  slug: string;
  chapter: number;
  scrollRatio: number;
  updatedAt: string;
};
export const LIBRARY_EVENT = 'vuon-library-change';
function read(key: string): unknown[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    return Array.isArray(value.items) ? value.items : [];
  } catch {
    return [];
  }
}
export function readBookmarks(): string[] {
  return [
    ...new Set(
      read('bookmarks').filter(
        (item): item is string => typeof item === 'string',
      ),
    ),
  ];
}
export function readHistory(): HistoryItem[] {
  return read('history')
    .filter((item): item is HistoryItem => {
      if (!item || typeof item !== 'object') return false;
      const entry = item as Partial<HistoryItem>;
      return (
        typeof entry.storyId === 'string' &&
        typeof entry.slug === 'string' &&
        Number.isInteger(entry.chapter) &&
        Number(entry.chapter) > 0 &&
        typeof entry.scrollRatio === 'number' &&
        Number.isFinite(entry.scrollRatio)
      );
    })
    .map((item) => ({
      ...item,
      scrollRatio: Math.max(0, Math.min(1, item.scrollRatio)),
    }))
    .slice(0, 200);
}
export function writeLibrary(
  key: 'bookmarks' | 'history',
  items: string[] | HistoryItem[],
  notify = true,
) {
  try {
    localStorage.setItem(key, JSON.stringify({ version: 1, items }));
  } catch {
    throw new Error(
      'Không thể lưu trên trình duyệt. Hãy kiểm tra dung lượng hoặc quyền lưu trữ.',
    );
  }
  if (notify) window.dispatchEvent(new Event(LIBRARY_EVENT));
}
export function saveProgress(item: HistoryItem, notify = true) {
  writeLibrary(
    'history',
    [
      item,
      ...readHistory().filter((old) => old.storyId !== item.storyId),
    ].slice(0, 200),
    notify,
  );
}
