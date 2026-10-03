import Image from 'next/image';
import type { ComicPage } from '@/types/chapter';
import { AdSlot } from '@/components/ads/AdSlot';
export function ChapterContent({ pages }: { pages: ComicPage[] }) {
  const mid = Math.floor(pages.length / 2);
  return (
    <div className="comic-strip">
      {pages.map((page, i) => (
        <div key={page.id}>
          {i === mid && (
            <AdSlot placement="chapter-mid" pageCount={pages.length} />
          )}
          <Image
            src={page.image}
            width={page.width}
            height={page.height}
            sizes="(max-width: 768px) 100vw, 900px"
            priority={i === 0}
            loading={i === 0 ? 'eager' : 'lazy'}
            alt={page.alt}
            className="block h-auto w-full"
          />
        </div>
      ))}
    </div>
  );
}
