'use server';

import { currentPageUser } from '@/server/auth/session';
import { createChapterReport } from '@/server/moderation/repository';
import { ApiError } from '@/server/http/errors';

export async function submitReport(storyId: string, chapterNumber: number, message: string) {
  if (!message.trim()) return;
  const user = await currentPageUser();
  if (!user) throw new ApiError('UNAUTHENTICATED', 'Vui lòng đăng nhập để báo lỗi chap.');
  const [rawType, ...parts] = message.split(':');
  const type = ['missing', 'typo', 'display', 'takedown'].includes(rawType) ? rawType : 'other';
  await createChapterReport(user, { storyId, chapterNumber, type, message: parts.join(':').trim() || message.trim() });
}
