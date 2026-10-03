import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getChapter, getStoryBySlug } from '@/features/catalog/services';
import { parseChapterParam } from '@/shared/lib/utils/parseChapterParam';
import { ChapterContent } from '@/features/reader/components/ChapterContent';
import { ReaderClient } from '@/features/reader/components/ReaderClient';
import { AdSlot } from '@/features/advertising/components/AdSlot';
export const revalidate = 3600;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; chap: string }>;
}): Promise<Metadata> {
  const p = await params,
    n = parseChapterParam(p.chap),
    s = await getStoryBySlug(p.slug);
  return s && n
    ? {
        title: `Chap ${n}: ${s.title}`,
        description: `Đọc chap ${n} truyện ${s.title}.`,
        alternates: { canonical: `/truyen/${p.slug}/chap-${n}` },
      }
    : { title: 'Không tìm thấy chap' };
}
export default async function ReaderPage({
  params,
}: {
  params: Promise<{ slug: string; chap: string }>;
}) {
  const { slug, chap } = await params,
    n = parseChapterParam(chap);
  if (!n) notFound();
  const [data, story] = await Promise.all([
    getChapter(slug, n),
    getStoryBySlug(slug),
  ]);
  if (!data || !story) notFound();
  return (
    <article
      data-reader
      data-reader-theme="site"
      className="comic-reader bg-[var(--reader-bg)] py-8 text-[var(--reader-text)]"
    >
      <ReaderClient
        storyId={story.id}
        slug={slug}
        chapter={n}
        prev={data.prev}
        next={data.next}
      />
      <header className="mx-auto max-w-[900px] px-4 pb-8 text-center">
        <Link href={`/truyen/${slug}`} className="text-sm text-accent">
          {story.title}
        </Link>
        <p className="muted mt-4 uppercase tracking-widest">Chap {n}</p>
        <h1
          className="mt-2 text-2xl font-bold"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {data.chapter.title}
        </h1>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            className={`btn ${!data.prev ? 'pointer-events-none opacity-50' : ''}`}
            href={data.prev ? `/truyen/${slug}/chap-${data.prev}` : '#'}
          >
            ← Chap trước
          </Link>
          <Link
            className={`btn ${!data.next ? 'pointer-events-none opacity-50' : ''}`}
            href={data.next ? `/truyen/${slug}/chap-${data.next}` : '#'}
          >
            Chap sau →
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[900px]">
        <ChapterContent pages={data.chapter.pages} />
        <div className="px-4">
          <AdSlot placement="chapter-end" />
          <div className="mt-8 flex justify-between">
            <Link
              className="btn"
              href={data.prev ? `/truyen/${slug}/chap-${data.prev}` : '#'}
            >
              ← Chap trước
            </Link>
            <Link
              className="btn btn-primary"
              href={
                data.next
                  ? `/truyen/${slug}/chap-${data.next}`
                  : `/truyen/${slug}`
              }
            >
              {data.next ? 'Chap sau →' : 'Về trang truyện'}
            </Link>
          </div>
        </div>
      </main>
    </article>
  );
}
