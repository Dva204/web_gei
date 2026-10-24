import type { ChatClient, ChatMessage, ChatRoom } from '@/features/chat/types';

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, { method, credentials: 'same-origin', cache: 'no-store', ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result || !('data' in result)) throw new Error(result?.error?.message || 'Không kết nối được máy chủ.');
  return result.data as T;
}
const lastSeen = new Map<string, string>();
const httpClient: ChatClient = {
  subscribe(roomId, onMessage) {
    let active = true, working = false;
    const poll = async () => {
      if (!active || working) return; working = true;
      try {
        const after = lastSeen.get(roomId);
        const result = await request<{ items: ChatMessage[] }>(`/api/chat/rooms/${encodeURIComponent(roomId)}/messages?limit=100${after ? `&after=${encodeURIComponent(after)}` : ''}`);
        for (const message of result.items) { lastSeen.set(roomId, message.createdAt); onMessage(message); }
      } catch { /* A later poll retries; the page keeps existing messages. */ }
      finally { working = false; }
    };
    const timer = window.setInterval(() => void poll(), 3000);
    return () => { active = false; window.clearInterval(timer); };
  },
  async send(roomId, content, replyToId) {
    try {
      const message = await request<ChatMessage>(`/api/chat/rooms/${encodeURIComponent(roomId)}/messages`, 'POST', { content, replyToId });
      lastSeen.set(roomId, message.createdAt);
      return { ok: true, message };
    } catch (error) { return { ok: false, reason: 'offline', message: (error as Error).message }; }
  },
  async loadOlder(roomId, beforeId, limit) {
    const before = beforeId && !beforeId.startsWith('m999') ? `&before=${encodeURIComponent(beforeId)}` : '';
    const result = await request<{ items: ChatMessage[] }>(`/api/chat/rooms/${encodeURIComponent(roomId)}/messages?limit=${limit}${before}`);
    const latest = result.items.at(-1); if (latest) lastSeen.set(roomId, latest.createdAt);
    return result.items;
  },
  onPresence(roomId, cb) {
    let active = true;
    const poll = async () => { try { const result = await request<{ online: number }>(`/api/chat/rooms/${encodeURIComponent(roomId)}/messages?limit=1`); if (active) cb(result.online); } catch { if (active) cb(0); } };
    void poll(); const timer = window.setInterval(() => void poll(), 15000);
    return () => { active = false; window.clearInterval(timer); };
  },
  getRooms() { return request<ChatRoom[]>('/api/chat/rooms'); },
  getPinned(roomId) { return request<ChatMessage | null>(`/api/chat/rooms/${encodeURIComponent(roomId)}/messages?pinned=1`); },
};
export const chatClient = httpClient;
export function reportChatMessage(id: string, reason: string) { return request<{ reported: true }>(`/api/chat/messages/${encodeURIComponent(id)}/report`, 'POST', { reason }); }
export type { ChatClient, ChatMessage, ChatRoom } from '@/features/chat/types';
