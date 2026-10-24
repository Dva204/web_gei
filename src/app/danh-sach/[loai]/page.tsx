import type { Metadata } from 'next';
import { listStories } from '@/features/catalog/services';
import { StoryGrid } from '@/features/catalog/components/StoryGrid';
import { Pagination } from '@/shared/components/Pagination';
import type { Status } from '@/features/catalog/types/story';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Danh sách truyện' };
export default async function ListPage({
  params,
  searchParams,
}: {
  params: Promise<{ loai: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { loai } = await params,
    { page = '1', sort, status } = await searchParams;
  const d = await listStories({
    page: Number(page),
    status: (loai === 'truyen-full' ? 'full' : status) as Status | undefined,
    sort: (loai === 'truyen-hot' ? 'views' : sort || 'updated') as
      'views' | 'updated' | 'rating' | 'new',
  });
  return (
    <div className="container section">
      <h1 className="section-title">
        {loai === 'truyen-full'
          ? 'Truyện hoàn thành'
          : loai === 'truyen-hot'
            ? 'Truyện được yêu thích'
            : 'Truyện mới cập nhật'}
      </h1>
      <form className="card mb-8 flex flex-wrap gap-3 p-4">
        <select name="status" defaultValue={status} className="btn">
          <option value="">Mọi trạng thái</option>
          <option value="ongoing">Đang ra</option>
          <option value="full">Hoàn thành</option>
          <option value="paused">Tạm dừng</option>
        </select>
        <select name="sort" defaultValue={sort} className="btn">
          <option value="updated">Mới cập nhật</option>
          <option value="views">Xem nhiều</option>
          <option value="rating">Điểm cao</option>
          <option value="new">Mới đăng</option>
        </select>
        <button className="btn btn-primary">Áp dụng</button>
      </form>
      <StoryGrid stories={d.items} withAds />
      <Pagination
        page={d.page}
        totalPages={d.totalPages}
        base={`/danh-sach/${loai}?${new URLSearchParams({ ...(status ? { status } : {}), ...(sort ? { sort } : {}) })}`}
      />
    </div>
  );
}
