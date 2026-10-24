import type { Story } from '@/features/catalog/types/story';
import type { HistoryItem } from '../lib/storage';

export type LibraryData = {
  bookmarks: { storyId: string; createdAt: string; story: Story }[];
  history: (HistoryItem & { story: Story })[];
};
let remoteKnown: boolean | null = null;
async function request<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T | null> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    keepalive: method !== 'GET',
    ...(body === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
  });
  if (response.status === 401) {
    remoteKnown = false;
    return null;
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.data)
    throw new Error(payload?.error?.message || 'Không thể đồng bộ tủ truyện.');
  remoteKnown = true;
  return payload.data as T;
}
export const loadRemoteLibrary = () => request<LibraryData>('/api/library');
export async function setRemoteBookmark(storyId: string, saved: boolean) {
  return request<{ storyId: string; saved: boolean }>(
    '/api/library/bookmarks/' + encodeURIComponent(storyId),
    saved ? 'PUT' : 'DELETE',
  );
}
export async function setRemoteProgress(item: HistoryItem) {
  if (remoteKnown === false) return null;
  return request(
    '/api/library/history/' + encodeURIComponent(item.storyId),
    'PUT',
    { chapter: item.chapter, scrollRatio: item.scrollRatio },
  );
}
export async function removeRemote(
  kind: 'bookmarks' | 'history',
  storyId?: string,
) {
  return storyId
    ? request(
        '/api/library/' + kind + '/' + encodeURIComponent(storyId),
        'DELETE',
      )
    : request('/api/library', 'DELETE', { kind });
}
export const importLocalLibrary = (
  bookmarks: string[],
  history: HistoryItem[],
) =>
  request<{ bookmarks: number; history: number; skipped: number }>(
    '/api/library/import',
    'POST',
    { bookmarks, history },
  );
export const remoteSessionKnown = () => remoteKnown;
export const resetRemoteKnowledge = () => {
  remoteKnown = null;
};
