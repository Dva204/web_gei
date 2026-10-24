import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getChapter, getStoryBySlug } from '@/features/catalog/services';
import { parseChapterParam } from '@/shared/lib/utils/parseChapterParam';
import { ReaderClient } from '@/features/reader/components/ReaderClient';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; chap: string }>;
}): Promise<Metadata> {
  const { slug, chap } = await params,
    n = parseChapterParam(chap),
    story = await getStoryBySlug(slug),
    data = n ? await getChapter(slug, n) : null;
  return story && n && data
    ? {
        title: 'Chap ' + n + ': ' + story.title,
        description: 'Đọc chap ' + n + ' truyện ' + story.title + '.',
        alternates: { canonical: '/truyen/' + slug + '/chap-' + n },
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
  if (!story || !data) notFound();
  return (
    <article
      data-reader
      data-reader-theme="site"
      className="comic-reader bg-[var(--reader-bg)] py-8 text-[var(--reader-text)]"
    >
      <ReaderClient
        key={slug + ':' + n}
        storyId={story.id}
        slug={slug}
        chapter={n}
        totalChapters={story.totalChapters}
        initialPages={data.chapter.pages}
        publishedNumbers={data.publishedNumbers}
      />
    </article>
  );
}
