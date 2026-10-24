'use client';
import Link from 'next/link';
import { useLibrary } from '../hooks/useLibrary';
export function ContinueReading({
  storyId,
  slug,
}: {
  storyId: string;
  slug: string;
}) {
  const { history } = useLibrary(),
    item = history.find((entry) => entry.storyId === storyId);
  return item ? (
    <Link
      className="btn btn-primary"
      href={`/truyen/${slug}/chap-${item.chapter}`}
    >
      Đọc tiếp chap {item.chapter}
    </Link>
  ) : null;
}
