import Link from 'next/link';
import type { ChapterMeta } from '@/types/chapter';
export function ChapterList({
  slug,
  chapters,
}: {
  slug: string;
  chapters: ChapterMeta[];
}) {
  return (
    <ol className="card divide-y divide-border">
      {chapters.map((c) => (
        <li key={c.number}>
          <Link
            className="flex min-h-14 items-center gap-3 px-4 hover:bg-surface-2"
            href={`/truyen/${slug}/chap-${c.number}`}
          >
            <span className="muted whitespace-nowrap shrink-0">Chap {c.number}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
