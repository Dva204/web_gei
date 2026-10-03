'use server';

import { takedowns } from '@/features/admin/mocks/store';

export async function submitTakedown(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const url = formData.get('url') as string;
  const description = formData.get('description') as string;

  if (!name || !email || !url || !description) return;

  const newId = `td${takedowns.length + 1}`;
  
  takedowns.unshift({
    id: newId,
    requesterName: name,
    requesterEmail: email,
    organization: '',
    targetUrls: [url],
    description: description,
    status: 'new',
    dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    log: [],
    createdAt: new Date().toISOString()
  });
}
