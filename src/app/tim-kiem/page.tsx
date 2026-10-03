import type { Metadata } from 'next';
import { searchStories } from '@/lib/data';
import { StoryGrid } from '@/components/story/StoryGrid';
import { Pagination } from '@/components/shared/Pagination';
export const metadata: Metadata = {
  title: 'Tìm kiếm',
  robots: { index: false },
};
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = '', page = '1' } = await searchParams,
    d = q ? await searchStories(q, Number(page)) : null;
  return (
    <div className="container section">
      <h1 className="section-title">Tìm kiếm truyện</h1>
      <form className="card mb-8 flex gap-2 p-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Tên truyện hoặc tác giả"
          className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-border bg-bg px-4"
        />
        <button className="btn btn-primary">Tìm kiếm</button>
      </form>
      {d?.items.length ? (
        <>
          <p className="muted mb-6">
            Tìm thấy {d.total} kết quả cho “{q}”
          </p>
          <StoryGrid stories={d.items} />
          <Pagination
            page={d.page}
            totalPages={d.totalPages}
            base={`/tim-kiem?q=${encodeURIComponent(q)}`}
          />
        </>
      ) : (
        <div className="card p-10 text-center">
          <h2>{q ? 'Không tìm thấy truyện' : 'Nhập từ khóa để bắt đầu'}</h2>
          <p className="muted mt-2">
            Bạn có thể thử tên truyện hoặc tên tác giả, có dấu hay không dấu đều
            được.
          </p>
        </div>
      )}
    </div>
  );
}
