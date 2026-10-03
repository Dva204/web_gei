'use client';
import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
export function BookmarkButton({ storyId, variant = 'default' }: { storyId: string, variant?: 'default' | 'icon' }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      setSaved(
        (
          JSON.parse(
            localStorage.getItem('bookmarks') || '{"version":1,"items":[]}',
          ).items as string[]
        ).includes(storyId),
      );
    } catch {}
  }, [storyId]);
  function toggle() {
    let items: string[] = [];
    try {
      items =
        JSON.parse(localStorage.getItem('bookmarks') || '{"items":[]}').items ||
        [];
    } catch {}
    items = saved ? items.filter((x) => x !== storyId) : [...items, storyId];
    localStorage.setItem('bookmarks', JSON.stringify({ version: 1, items }));
    setSaved(!saved);
  }

  if (variant === 'icon') {
    return (
      <button 
        onClick={toggle}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        aria-label="Lưu vào tủ"
      >
        <Heart size={18} fill={saved ? 'currentColor' : 'none'} className={saved ? 'text-pink-500' : ''} />
      </button>
    );
  }

  return (
    <button className={saved ? 'btn btn-primary' : 'btn'} onClick={toggle}>
      <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
      {saved ? 'Đã lưu' : 'Lưu vào tủ'}
    </button>
  );
}
