import { getGenreBySlug, listStories } from '@/features/catalog/services';
import { notFound } from 'next/navigation';
import { StoryGrid } from '@/features/catalog/components/StoryGrid';
import { Pagination } from '@/shared/components/Pagination';
export const dynamic = 'force-dynamic';
export default async function GenrePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params,
    { page = '1' } = await searchParams;
  const genre = await getGenreBySlug(slug);
  if (!genre) notFound();
  const d = await listStories({ genre: slug, page: Number(page) });
  return (
    <div className="container section">
      <span className="chip">Thể loại</span>
      <h1 className="section-title mt-3">{genre.name}</h1>
      <p className="muted mb-8">{genre.description}</p>
      <StoryGrid stories={d.items} withAds />
      <Pagination
        page={d.page}
        totalPages={d.totalPages}
        base={`/the-loai/${slug}`}
      />
    </div>
  );
}
