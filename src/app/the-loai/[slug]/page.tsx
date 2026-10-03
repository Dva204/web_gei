import { genres, listStories } from '@/lib/data';
import { notFound } from 'next/navigation';
import { StoryGrid } from '@/components/story/StoryGrid';
import { Pagination } from '@/components/shared/Pagination';
export async function generateStaticParams() {
  return genres.map((g) => ({ slug: g.slug }));
}
export default async function GenrePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params,
    { page = '1' } = await searchParams;
  const genre = genres.find((g) => g.slug === slug);
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
