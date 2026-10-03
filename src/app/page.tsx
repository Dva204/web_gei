import { listStories } from '@/features/catalog/services';
import { StoryGrid } from '@/features/catalog/components/StoryGrid';
import { AdSlot } from '@/features/advertising/components/AdSlot';
import { copy } from '@/shared/lib/copy';
import Link from 'next/link';
export const revalidate = 3600;
async function Shelf({
  title,
  genre,
  status,
  sort = 'updated',
}: {
  title: string;
  genre?: string;
  status?: 'full' | 'ongoing' | 'paused';
  sort?: 'updated' | 'views' | 'rating' | 'new';
}) {
  const d = await listStories({ genre, status, sort, pageSize: 8 });
  return (
    <section className="section">
      <div className="mb-5 flex items-end justify-between">
        <h2 className="section-title mb-0">{title}</h2>
        <Link
          href={genre ? `/the-loai/${genre}` : '/danh-sach/truyen-moi'}
          className="text-sm text-accent"
        >
          Xem tất cả →
        </Link>
      </div>
      <StoryGrid stories={d.items} />
    </section>
  );
}
export default async function Home() {
  const featured = await listStories({ sort: 'rating', pageSize: 6 });
  return (
    <>
      <section className="home-hero border-b border-border bg-surface">
        <div className="container grid gap-8 py-12 md:grid-cols-[1fr_1.4fr] md:items-center">
          <div>
            <span className="chip">Truyện chọn lọc mỗi ngày</span>
            <h1
              className="mt-4 text-4xl font-bold leading-tight md:text-6xl"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Một khoảng lặng
              <br />
              <span className="text-accent">dành riêng cho bạn</span>
            </h1>
            <p className="muted mt-5 max-w-lg text-lg">
              {copy.tagline}. Không gian đọc ấm áp, thanh lịch và không xao
              nhãng.
            </p>
          </div>
          <StoryGrid stories={featured.items.slice(0, 4)} variant="grid" />
        </div>
      </section>
      <div className="container">
        <Shelf title="Bảng xếp hạng" sort="views" />
        <AdSlot placement="home-between" />
        <Shelf title="Mới cập nhật" sort="updated" />
        <AdSlot placement="home-affiliate" />
        <Shelf title="Truyện hoàn thành" status="full" />
      </div>
    </>
  );
}
