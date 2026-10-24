export function mediaUrl(storageKey?: string | null) {
  if (!storageKey) return undefined;
  if (/^https?:\/\//i.test(storageKey)) return storageKey;
  if (/^(?:comic|covers)\/[a-f0-9-]{36}\.webp$/.test(storageKey)) return '/api/media/' + storageKey;
  let base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, '') ?? '';
  // Keep local media relative when reached from a phone/ngrok tunnel.
  try { if (base && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) base = ''; } catch { base = ''; }
  const key = storageKey.replace(/^\//, '');
  return base ? `${base}/${key}` : `/${key}`;
}
