import type { Comment } from '@/features/comments/types';
const users = [
  ['u1', 'Mây Nhỏ', 'member'],
  ['u2', 'An Nhiên', 'member'],
  ['u3', 'Quản gia Vườn', 'admin'],
  ['u4', 'Gió Lam', 'mod'],
] as const;
let comments: Comment[] = Array.from({ length: 40 }, (_, i) => ({
  id: `c${i + 1}`,
  storyId: String((i % 8) + 1),
  chapterNumber: i % 3 === 0 ? (i % 10) + 1 : undefined,
  parentId: i % 7 === 0 && i ? `c${i}` : undefined,
  user: { id: users[i % 4][0], name: users[i % 4][1], role: users[i % 4][2] },
  content:
    i % 9 === 0
      ? 'Đoạn này thật dịu dàng, mình đọc chậm lại để giữ cảm giác ấm áp ấy lâu hơn một chút 🌿'
      : `Mình rất thích cách nhân vật lựa chọn nói thật ở phần này. Chi tiết nhỏ nhưng khiến câu chuyện gần gũi hơn.`,
  isSpoiler: i % 11 === 0,
  likes: (i * 3) % 27,
  status: i % 13 === 0 ? 'pending' : 'visible',
  createdAt: new Date(Date.now() - i * 3600000).toISOString(),
}));
export async function listComments(
  storyId: string,
  opts: { chapterNumber?: number; sort: 'new' | 'top'; cursor?: string },
) {
  let a = comments.filter(
    (c) =>
      c.storyId === storyId &&
      (!opts.chapterNumber || c.chapterNumber === opts.chapterNumber),
  );
  a = [...a].sort((x, y) =>
    opts.sort === 'top'
      ? y.likes - x.likes
      : +new Date(y.createdAt) - +new Date(x.createdAt),
  );
  const start = opts.cursor ? Number(opts.cursor) : 0;
  return {
    items: a.slice(start, start + 10),
    nextCursor: start + 10 < a.length ? String(start + 10) : undefined,
  };
}
export async function postComment(
  input: Omit<Comment, 'id' | 'likes' | 'status' | 'createdAt'>,
) {
  const c: Comment = {
    ...input,
    id: `c${Date.now()}`,
    likes: 0,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  comments = [c, ...comments];
  return c;
}
export async function likeComment(id: string) {
  const c = comments.find((x) => x.id === id);
  if (c) c.likes++;
}
export async function reportComment(_id: string, _reason: string) {}
import { chapterReports } from '@/features/admin/mocks/store';

export async function reportChapterError(
  storyId: string,
  chapterNumber: number,
  message: string,
) {
  chapterReports.unshift({
    id: `r${Date.now()}`,
    storyId,
    chapterNumber,
    type: 'display',
    message,
    status: 'new',
    createdAt: new Date().toISOString()
  });
}
