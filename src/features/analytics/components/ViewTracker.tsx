'use client';

import { useEffect } from 'react';

const storageKey = 'vuon-browser-id';
function browserId() {
  let value = window.localStorage.getItem(storageKey);
  if (!value || !/^[A-Za-z0-9_-]{16,80}$/.test(value)) {
    value = crypto.randomUUID();
    window.localStorage.setItem(storageKey, value);
  }
  return value;
}

export function ViewTracker({ storyId, path }: { storyId?: string; path: string }) {
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/analytics/views', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId, path, clientId: browserId() }),
      signal: controller.signal,
    }).catch(() => undefined);
    return () => controller.abort();
  }, [path, storyId]);
  return null;
}
