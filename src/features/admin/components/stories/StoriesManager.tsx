'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import {
  listStoriesAdmin,
  trashStory,
} from '@/features/admin/services/stories';
import { getAdminSession } from '@/features/admin/services/auth';
import { can } from '@/features/admin/lib/permissions';
import type { Paginated, StoryAdmin } from '@/features/admin/types';
import {
  PageHeader,
  StatusBadge,
} from '@/features/admin/components/common/AdminUI';
export function StoriesManager() {
  const [result, setResult] = useState<Paginated<StoryAdmin>>({
    items: [],
    total: 0,
    totalPages: 0,
    page: 1,
    pageSize: 20,
  });
  const [search, setSearch] = useState(''),
    [visibility, setVisibility] = useState(''),
    [rights, setRights] = useState('');
  const [deleted, setDeleted] = useState(false),
    [page, setPage] = useState(1),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      listStoriesAdmin({
        search,
        visibility,
        rights,
        deleted,
        page,
        pageSize: 20,
      })
        .then((data) => {
          if (active) {
            setResult(data);
            setError('');
          }
        })
        .catch((error) => {
          if (active) setError(error.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search, visibility, rights, deleted, page, retry]);
  const user = getAdminSession(),
    mayPublish = can(user, 'stories.publish'),
    mayCreate = can(user, 'stories.manage') || user?.role === 'author';
  async function trash(story: StoryAdmin) {
    if (
      busy ||
      !window.confirm(
        deleted
          ? 'Khôi phục truyện về trạng thái ẩn?'
          : 'Đưa truyện vào thùng rác? Dữ liệu chap vẫn được giữ.',
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      await trashStory(story, deleted);
      setRetry((value) => value + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không thể cập nhật.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Kho truyện"
        description="Danh mục PostgreSQL; phân quyền và phân trang trên máy chủ."
        actions={
          mayCreate ? (
            <Link
              className="btn btn-primary"
              href="/admin/truyen/moi"
              prefetch={false}
            >
              <Plus size={17} />
              Thêm truyện
            </Link>
          ) : undefined
        }
      />
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={17} />
          <input
            aria-label="Tìm tên truyện"
            placeholder="Tìm tên truyện…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <select
          aria-label="Hiển thị"
          value={visibility}
          onChange={(event) => {
            setVisibility(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả hiển thị</option>
          <option value="public">Công khai</option>
          <option value="draft">Bản nháp</option>
          <option value="hidden">Ẩn</option>
        </select>
        <select
          aria-label="Quyền sử dụng"
          value={rights}
          onChange={(event) => {
            setRights(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả quyền sử dụng</option>
          <option value="missing">Thiếu khai báo</option>
        </select>
        {mayPublish && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={deleted}
              onChange={(event) => {
                setDeleted(event.target.checked);
                setPage(1);
              }}
            />
            Thùng rác
          </label>
        )}
      </div>
      {error && (
        <div className="admin-alert danger" role="alert">
          {error}
          <button
            className="btn"
            onClick={() => setRetry((value) => value + 1)}
          >
            Thử lại
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">Đang tải…</p>
      ) : (
        !error && (
          <div className="admin-table-card">
            {!result.items.length ? (
              <p className="admin-empty">
                Chưa có truyện phù hợp. Thêm truyện mới hoặc kiểm tra phân công.
              </p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Truyện</th>
                    <th>Hiển thị</th>
                    <th>Tiến độ</th>
                    <th>Quyền sử dụng</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((story) => (
                    <tr key={story.id}>
                      <td data-label="Truyện">
                        <strong>{story.title}</strong>
                        <small>
                          {story.author} · {story.totalChapters} chap đã xuất
                          bản
                        </small>
                      </td>
                      <td data-label="Hiển thị">
                        <StatusBadge value={story.visibility} />
                      </td>
                      <td data-label="Tiến độ">
                        <StatusBadge value={story.status} />
                      </td>
                      <td data-label="Quyền">
                        {story.rightsType ? 'Đã khai báo' : 'Còn thiếu'}
                      </td>
                      <td className="table-actions">
                        <Link
                          className="btn"
                          href={'/admin/truyen/' + story.id}
                        >
                          Thông tin
                        </Link>
                        {!deleted && (
                          <Link
                            className="btn"
                            href={`/admin/truyen/${story.id}/chuong`}
                          >
                            Chap
                          </Link>
                        )}
                        {!deleted &&
                          story.totalChapters > 0 &&
                          story.visibility === 'public' && (
                            <Link
                              className="btn"
                              href={'/truyen/' + story.slug}
                            >
                              Xem
                            </Link>
                          )}
                        {mayPublish && (
                          <button
                            className="btn"
                            disabled={busy}
                            onClick={() => trash(story)}
                          >
                            {deleted ? 'Khôi phục' : 'Xóa mềm'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      )}
      <nav
        className="mt-4 flex justify-center gap-3"
        aria-label="Phân trang kho truyện"
      >
        <button
          className="btn"
          disabled={result.page <= 1 || loading}
          onClick={() => setPage(result.page - 1)}
        >
          Trước
        </button>
        <span className="btn">
          {result.page}/{Math.max(1, result.totalPages)} · {result.total} truyện
        </span>
        <button
          className="btn"
          disabled={result.page >= result.totalPages || loading}
          onClick={() => setPage(result.page + 1)}
        >
          Sau
        </button>
      </nav>
      <p className="admin-alert">
        Mở mục Chap để upload ảnh, lưu nháp hoặc xuất bản. Truyện chỉ hiện ở
        user khi công khai, có quyền hợp lệ và ít nhất một chap đã xuất bản.
      </p>
    </>
  );
}
