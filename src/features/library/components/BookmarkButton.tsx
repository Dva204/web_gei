'use client';
import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useLibrary } from '../hooks/useLibrary';
import { readBookmarks, writeLibrary } from '../lib/storage';
import { setRemoteBookmark } from '../services/client';
import { LIBRARY_EVENT } from '../lib/storage';
export function BookmarkButton({
  storyId,
  variant = 'default',
}: {
  storyId: string;
  variant?: 'default' | 'icon';
}) {
  const { bookmarks, remote, ready, error: syncError } = useLibrary(),
    saved = bookmarks.includes(storyId);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function toggle() {
    if (busy || !ready) return;
    if (syncError) {
      setError(syncError);
      return;
    }
    setBusy(true);
    try {
      if (remote) {
        await setRemoteBookmark(storyId, !saved);
        window.dispatchEvent(new Event(LIBRARY_EVENT));
      } else {
        const current = readBookmarks();
        writeLibrary(
          'bookmarks',
          current.includes(storyId)
            ? current.filter((id) => id !== storyId)
            : [...current, storyId],
        );
      }
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy || !ready}
        className={
          variant === 'icon'
            ? 'btn bookmark-icon'
            : saved
              ? 'btn btn-primary'
              : 'btn'
        }
        aria-label={saved ? 'Bỏ lưu khỏi tủ' : 'Lưu vào tủ'}
        aria-pressed={saved}
      >
        <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
        {variant !== 'icon' && (saved ? 'Đã lưu' : 'Lưu vào tủ')}
      </button>
      {error && (
        <p className="text-danger text-xs" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
