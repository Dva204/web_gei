'use server';

import { createTakedown } from '@/server/moderation/repository';

export async function submitTakedown(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const url = formData.get('url') as string;
  const description = formData.get('description') as string;

  return createTakedown({ requesterName: name, requesterEmail: email, targetUrls: [url], description });
}
