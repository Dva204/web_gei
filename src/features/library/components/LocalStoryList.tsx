'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
type Item = {
  storyId: string;
  slug?: string;
  chapter?: number;
  updatedAt?: string;
};
export function LocalStoryList({ kind }: { kind: 'bookmarks' | 'history' }) {
  const [items, setItems] = useState<Item[] | null>(null);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(kind) || '{"items":[]}');
      setItems(
        kind === 'bookmarks'
          ? (raw.items || []).map((storyId: string) => ({ storyId }))
          : raw.items || [],
      );
    } catch {
      setItems([]);
    }
  }, [kind]);
  if (items === null) return <div className="card p-8">Đang tải…</div>;
  if (!items.length)
    return (
      <div className="card p-10 text-center">
        <h2>Chưa có truyện nào</h2>
        <p className="muted mt-2">
          {kind === 'bookmarks'
            ? 'Hãy lưu một truyện bạn yêu thích.'
            : 'Lịch sử sẽ xuất hiện khi bạn bắt đầu đọc.'}
        </p>
        <Link className="btn btn-primary mt-5" href="/">
          Khám phá truyện
        </Link>
      </div>
    );
  return (
    <div className="grid gap-3">
      {items.map((i) => (
        <article
          className="card flex items-center justify-between p-4"
          key={i.storyId}
        >
          <div>
            <strong>Truyện #{i.storyId}</strong>
            {i.chapter && (
              <p className="muted text-sm">Đang đọc chap {i.chapter}</p>
            )}
          </div>
          <Link
            className="btn btn-primary"
            href={i.slug ? `/truyen/${i.slug}/chap-${i.chapter || 1}` : `/`}
          >
            Đọc tiếp
          </Link>
        </article>
      ))}
    </div>
  );
}
