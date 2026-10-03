'use server';

import { postComment } from '@/lib/comments';
import { revalidatePath } from 'next/cache';

export async function submitComment(storyId: string, content: string) {
  if (!content.trim()) return;
  await postComment({
    storyId,
    content,
    isSpoiler: false,
    user: { id: 'u_guest', name: 'Khách', role: 'member' }
  });
  revalidatePath(`/truyen/[slug]`, 'page');
}
