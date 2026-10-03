import type { ChatClient, ChatMessage, ChatRoom } from '@/features/chat/types';
const rooms: ChatRoom[] = [
  { id: 'chung', slug: 'chung', name: 'Trò chuyện chung', slowModeSec: 5 },
  { id: 'hoi-admin', slug: 'hoi-admin', name: 'Hỏi Admin' },
];
const samples = [
  'Chúc mọi người một buổi đọc truyện thật vui!',
  'Chương mới hôm nay dịu dàng quá 🌸',
  '@admin cho mình hỏi lịch cập nhật nhé.',
  'Mình vừa tìm được một truyện chữa lành rất hay.',
];
const messages: ChatMessage[] = Array.from({ length: 72 }, (_, i) => ({
  id: `m${i}`,
  roomId: i % 4 ? 'chung' : 'hoi-admin',
  user: {
    id: `u${i % 9}`,
    name: i % 10 === 0 ? 'Quản gia Vườn' : `Bạn đọc ${(i % 9) + 1}`,
    role: i % 10 === 0 ? 'admin' : 'member',
  },
  content: samples[i % samples.length],
  isPinned: i === 0,
  status: 'visible',
  createdAt: new Date(Date.now() - (72 - i) * 60000).toISOString(),
}));
export const mockClient: ChatClient = {
  subscribe(roomId, cb) {
    if (process.env.NODE_ENV !== 'development') return () => {};
    const timer = setInterval(
      () =>
        cb({
          ...messages[Math.floor(Math.random() * messages.length)],
          id: `live-${Date.now()}`,
          roomId,
          createdAt: new Date().toISOString(),
        }),
      5000,
    );
    return () => clearInterval(timer);
  },
  async send(roomId, content, replyToId) {
    if (content.length > 300) return { ok: false, reason: 'too_long' };
    messages.push({
      id: `m${Date.now()}`,
      roomId,
      user: { id: 'me', name: 'Khách đọc', role: 'member' },
      content,
      replyToId,
      status: 'visible',
      createdAt: new Date().toISOString(),
    });
    return { ok: true };
  },
  async loadOlder(roomId, beforeId, limit) {
    const i = messages.findIndex((x) => x.id === beforeId);
    return messages
      .filter((x) => x.roomId === roomId)
      .slice(Math.max(0, i - limit), i);
  },
  onPresence(_roomId, cb) {
    cb(128);
    return () => {};
  },
  async getRooms() {
    return rooms;
  },
  async getPinned(roomId) {
    return messages.find((x) => x.roomId === roomId && x.isPinned) || null;
  },
};
