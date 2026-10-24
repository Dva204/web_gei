'use client';
import Image from 'next/image';
import { useState } from 'react';
import type { ComicPage } from '@/features/catalog/types/chapter';
import { AdSlot } from '@/features/advertising/components/AdSlot';
export function ChapterContent({ pages }: { pages: ComicPage[] }) {
  const mid = Math.floor(pages.length / 2);
  return (
    <div className="comic-strip">
      {pages.map((page, i) => (
        <div key={page.id}>
          {i === mid && (
            <AdSlot placement="chapter-mid" pageCount={pages.length} />
          )}
          <ComicImage page={page} first={i === 0} />
        </div>
      ))}
    </div>
  );
}
function ComicImage({ page, first }: { page: ComicPage; first: boolean }) {
  const [failed, setFailed] = useState(false),
    [attempt, setAttempt] = useState(0);
  return failed ? (
    <div className="reader-error" role="alert">
      <p>Không tải được ảnh: {page.alt}</p>
      <button
        className="btn"
        onClick={() => {
          setFailed(false);
          setAttempt((value) => value + 1);
        }}
      >
        Tải lại ảnh
      </button>
    </div>
  ) : (
    <Image
      key={attempt}
      src={page.image}
      width={page.width}
      height={page.height}
      sizes="(max-width: 768px) 100vw, 900px"
      priority={first}
      loading={first ? 'eager' : 'lazy'}
      alt={page.alt}
      className="block h-auto w-full"
      unoptimized={
        page.image.startsWith('data:') || page.image.startsWith('blob:')
      }
      onError={() => setFailed(true)}
    />
  );
}
