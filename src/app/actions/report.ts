'use server';

import { reportChapterError } from '@/lib/comments';

export async function submitReport(storyId: string, chapterNumber: number, message: string) {
  if (!message.trim()) return;
  await reportChapterError(storyId, chapterNumber, message);
}
