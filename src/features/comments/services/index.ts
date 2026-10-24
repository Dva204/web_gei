import type { Comment } from '@/features/comments/types';

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, { method, credentials: 'same-origin', cache: 'no-store', ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.data) throw new Error(result?.error?.message || 'Không kết nối được máy chủ.');
  return result.data as T;
}
export function listComments(storyId: string, opts: { chapterNumber?: number; sort: 'new' | 'top'; cursor?: string }) {
  const query = new URLSearchParams({ storyId, sort: opts.sort });
  if (opts.chapterNumber) query.set('chapterNumber', String(opts.chapterNumber));
  if (opts.cursor) query.set('cursor', opts.cursor);
  return request<{ items: Comment[]; nextCursor?: string }>(`/api/comments?${query}`);
}
export function postComment(input: { storyId: string; chapterNumber?: number; parentId?: string; content: string; isSpoiler: boolean }) { return request<Comment>('/api/comments', 'POST', input); }
export function likeComment(id: string) { return request<{ id: string; liked: boolean; likes: number }>(`/api/comments/${encodeURIComponent(id)}/like`, 'POST'); }
export function reportComment(id: string, reason: string) { return request<{ reported: true }>(`/api/comments/${encodeURIComponent(id)}/report`, 'POST', { reason }); }
