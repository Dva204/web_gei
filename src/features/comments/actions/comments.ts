'use server';

import { revalidatePath } from 'next/cache';
import { currentPageUser } from '@/server/auth/session';
import { createComment } from '@/server/moderation/repository';
import { ApiError } from '@/server/http/errors';

export async function submitComment(storyId: string, content: string) {
  if (!content.trim()) return;
  const user = await currentPageUser();
  if (!user) throw new ApiError('UNAUTHENTICATED', 'Vui lòng đăng nhập.');
  await createComment(user, { storyId, content, isSpoiler: false });
  revalidatePath(`/truyen/[slug]`, 'page');
}
