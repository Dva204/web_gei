import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStoryBySlug, getChaptersPage, getRelatedStories } from '@/lib/data';
import { GeneratedCover } from '@/components/story/GeneratedCover';
import { ChapterList } from '@/components/chapter/ChapterList';
import { StoryGrid } from '@/components/story/StoryGrid';
import { Pagination } from '@/components/shared/Pagination';
import { BookmarkButton } from '@/components/story/BookmarkButton';
import { CommentSection } from '@/components/story/CommentSection';
import { AdSlot } from '@/components/ads/AdSlot';
import { formatNumber } from '@/lib/utils/format';
export const revalidate = 3600;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const s = await getStoryBySlug((await params).slug);
  return s
    ? {
        title: s.title,
        description: s.synopsis.slice(0, 155),
        alternates: { canonical: `/truyen/${s.slug}` },
      }
    : { title: 'Không tìm thấy truyện' };
}
export default async function StoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params,
    { page = '1' } = await searchParams;
  const s = await getStoryBySlug(slug);
  if (!s) notFound();
  const [chapters, related] = await Promise.all([
    getChaptersPage(slug, Number(page)),
    getRelatedStories(slug),
  ]);
  return (
    <div className="container section">
      <div className="grid gap-8 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr_300px]">
        <div className="relative mx-auto w-3/5 max-w-[240px] md:mx-0 md:w-full">
          <GeneratedCover title={s.title} index={Number(s.id)} />
          <div className="absolute top-2 right-2">
            <BookmarkButton storyId={s.id} variant="icon" />
          </div>
        </div>
        <div className="text-left">
          <h1
            className="text-3xl font-bold md:text-5xl"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {s.title}
          </h1>
          <p className="muted mt-3">Tác giả: {s.author}</p>
          
          <p className="muted mt-3">
            Tình trạng: {s.status === 'full' ? 'Hoàn thành' : s.status === 'paused' ? 'Tạm dừng' : 'Đang cập nhật'}
          </p>
          
          <div className="mt-2 flex flex-wrap items-center gap-5 text-sm">
            <span>⭐ {s.ratingCount ? s.rating : 'Chưa có đánh giá'}</span>
            <span>{formatNumber(s.views)} lượt đọc</span>
            <span>{s.totalChapters} chap</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {s.genres.map((g) => (
              <Link key={g} className="chip" href={`/the-loai/${g}`}>
                {g}
              </Link>
            ))}
          </div>
          <p className="mt-6 leading-8 text-justify">{s.synopsis}</p>
          <p className="mt-4 text-sm">
            <span className="font-semibold">Link raw: </span>
            <a href="#" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
              Đang cập nhật
            </a>
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <Link className="btn btn-primary w-full" href={`/truyen/${slug}/chap-1`}>
              Đọc từ đầu
            </Link>
            <Link
              className="btn w-full sm:w-auto"
              href={`/truyen/${slug}/chap-${s.latestChapter}`}
            >
              Chap mới nhất
            </Link>
          </div>
        </div>
        <div className="hidden lg:block">
          <AdSlot placement="story-sidebar" />
        </div>
      </div>
      <AdSlot placement="story-below-synopsis" />
      <section className="section">
        <h2 className="section-title">Danh sách chap</h2>
        <ChapterList slug={slug} chapters={chapters.items} />
        <Pagination
          page={chapters.page}
          totalPages={chapters.totalPages}
          base={`/truyen/${slug}`}
        />
      </section>
      <CommentSection storyId={s.id} />
      <section>
        <h2 className="section-title">Có thể bạn cũng thích</h2>
        <StoryGrid stories={related.slice(0, 8)} variant="carousel" />
      </section>
    </div>
  );
}
