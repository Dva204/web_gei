export function mediaUrl(storageKey?: string | null) {
  if (!storageKey) return undefined;
  if (/^https?:\/\//i.test(storageKey)) return storageKey;
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, '') ?? '';
  const key = storageKey.replace(/^\//, '');
  return base ? `${base}/${key}` : `/${key}`;
}
