import type { Metadata } from 'next';
export const dynamic = 'force-dynamic';
import { listGenres, searchStories } from '@/features/catalog/services';
import type { Status, Story } from '@/features/catalog/types/story';
import { StoryGrid } from '@/features/catalog/components/StoryGrid';
import { Pagination } from '@/shared/components/Pagination';
export const metadata: Metadata = {
  title: 'Tìm kiếm',
  robots: { index: false },
};
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const {
    q = '',
    page = '1',
    genre = '',
    status = '',
    sort = 'updated',
    ending = '',
    min = '',
    max = '',
  } = params;
  const filters = {
    genre,
    status: ['ongoing', 'full', 'paused'].includes(status)
      ? (status as Status)
      : undefined,
    sort: ['updated', 'views', 'rating', 'new'].includes(sort)
      ? (sort as 'updated' | 'views' | 'rating' | 'new')
      : ('updated' as const),
    ending: ['HE', 'SE', 'OE'].includes(ending)
      ? (ending as Story['ending'])
      : undefined,
    minChapters: Number(min) > 0 ? Number(min) : undefined,
    maxChapters: Number(max) > 0 ? Number(max) : undefined,
  };
  const searched = Boolean(q.trim() || genre || status || ending || min || max);
  const [genres, data] = await Promise.all([
    listGenres(),
    searched ? searchStories(q.trim(), Number(page), filters) : null,
  ]);
  const base =
    '/tim-kiem?' +
    new URLSearchParams(
      Object.fromEntries(
        Object.entries({ q, genre, status, sort, ending, min, max }).filter(
          ([, value]) => value,
        ),
      ),
    );
  return (
    <div className="container section">
      <h1 className="section-title">Tìm kiếm truyện</h1>
      <form className="card mb-8 grid gap-4 p-4">
        <div className="flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Tên truyện hoặc tác giả</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="Tên truyện hoặc tác giả"
              className="btn w-full justify-start text-left"
            />
          </label>
          <button className="btn btn-primary">Tìm kiếm</button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <label>
            Thể loại
            <select
              name="genre"
              defaultValue={genre}
              className="btn mt-2 w-full"
            >
              <option value="">Tất cả</option>
              {genres.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trạng thái
            <select
              name="status"
              defaultValue={status}
              className="btn mt-2 w-full"
            >
              <option value="">Tất cả</option>
              <option value="ongoing">Đang ra</option>
              <option value="full">Hoàn thành</option>
              <option value="paused">Tạm dừng</option>
            </select>
          </label>
          <label>
            Sắp xếp
            <select name="sort" defaultValue={sort} className="btn mt-2 w-full">
              <option value="updated">Mới cập nhật</option>
              <option value="views">Xem nhiều</option>
              <option value="rating">Điểm cao</option>
              <option value="new">Mới đăng</option>
            </select>
          </label>
          <label>
            Kết thúc
            <select
              name="ending"
              defaultValue={ending}
              className="btn mt-2 w-full"
            >
              <option value="">Tất cả</option>
              <option value="HE">HE</option>
              <option value="SE">SE</option>
              <option value="OE">OE</option>
            </select>
          </label>
          <label>
            Chap tối thiểu
            <input
              className="btn mt-2 w-full"
              name="min"
              type="number"
              min="1"
              step="1"
              defaultValue={min}
              inputMode="numeric"
            />
          </label>
          <label>
            Chap tối đa
            <input
              className="btn mt-2 w-full"
              name="max"
              type="number"
              min="1"
              step="1"
              defaultValue={max}
              inputMode="numeric"
            />
          </label>
        </div>
      </form>
      {data?.items.length ? (
        <>
          <p className="muted mb-6">
            Tìm thấy {data.total} kết quả
            {q.trim() ? ' cho “' + q.trim() + '”' : ''}
          </p>
          <StoryGrid stories={data.items} />
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            base={base}
          />
        </>
      ) : (
        <div className="card p-10 text-center">
          <h2>
            {searched
              ? 'Không có truyện phù hợp'
              : 'Nhập từ khóa hoặc chọn bộ lọc để bắt đầu'}
          </h2>
          <p className="muted mt-2">
            Hỗ trợ tìm không dấu theo tên truyện và tác giả. Bạn có thể bỏ bớt
            bộ lọc để tìm rộng hơn.
          </p>
        </div>
      )}
    </div>
  );
}
