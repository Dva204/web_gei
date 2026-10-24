'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPublishedChapterNumbers } from '../lib/comicStore';
export function PublishedLocalChapters({
  storyId,
  slug,
  baseTotal,
}: {
  storyId: string;
  slug: string;
  baseTotal: number;
}) {
  const [numbers, setNumbers] = useState<number[]>([]);
  useEffect(() => {
    let active = true;
    const sync = () => {
      void getPublishedChapterNumbers(storyId)
        .then((items) => {
          if (active)
            setNumbers(
              items
                .filter((number) => number > baseTotal)
                .sort((a, b) => a - b),
            );
        })
        .catch(() => {
          /* The server catalog remains usable without local storage. */
        });
    };
    const storage = (event: StorageEvent) => {
      if (event.key === 'vuon-comics-revision') sync();
    };
    sync();
    window.addEventListener('vuon-comics-change', sync);
    window.addEventListener('storage', storage);
    return () => {
      active = false;
      window.removeEventListener('vuon-comics-change', sync);
      window.removeEventListener('storage', storage);
    };
  }, [storyId, baseTotal]);
  if (!numbers.length) return null;
  return (
    <section className="card mt-5 p-4">
      <h3 className="font-semibold">Chap mới đã đăng trên trình duyệt này</h3>
      <p className="muted mt-2 text-sm">
        Ảnh FE demo chưa được đồng bộ lên máy chủ.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {numbers.map((number) => (
          <Link
            className="btn"
            key={number}
            href={'/truyen/' + slug + '/chap-' + number}
          >
            Chap {number}
          </Link>
        ))}
      </div>
    </section>
  );
}
