'use client';
import { useEffect, useState } from 'react';
import {
  listTaxonomy,
  saveTaxonomy,
  trashTaxonomy,
  type TaxonomyKind,
  type TaxonomyItem,
} from '../../services/taxonomy';
import { PageHeader } from '../common/AdminUI';
import { Modal } from '@/shared/components/ui/Modal';
import { normalizeVi } from '@/shared/lib/utils/normalizeVi';
import type { Paginated } from '@/shared/types/pagination';
export function TaxonomyManager({ kind }: { kind: TaxonomyKind }) {
  const title = kind === 'authors' ? 'Tác giả' : 'Thể loại';
  const [data, setData] = useState<Paginated<TaxonomyItem>>({
    items: [],
    total: 0,
    totalPages: 0,
    page: 1,
    pageSize: 20,
  });
  const [search, setSearch] = useState(''),
    [deleted, setDeleted] = useState(false),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0);
  const [edit, setEdit] = useState<TaxonomyItem | null>(null),
    [error, setError] = useState(''),
    [formError, setFormError] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      listTaxonomy(kind, { search, deleted, page, pageSize: 20 })
        .then((result) => {
          if (active) {
            setData(result);
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
  }, [kind, search, deleted, page, retry]);
  async function trash(item: TaxonomyItem) {
    if (
      busy ||
      !window.confirm(
        deleted
          ? 'Khôi phục mục này?'
          : 'Xóa mềm mục này? Mục đang được truyện sử dụng sẽ không được xóa.',
      )
    )
      return;
    setBusy(true);
    try {
      await trashTaxonomy(kind, item, deleted);
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
        title={title}
        description="Danh mục dùng chung, lưu trên PostgreSQL."
        actions={
          <button
            className="btn btn-primary"
            onClick={() => {
              setFormError('');
              setEdit({
                id: '',
                name: '',
                slug: '',
                description: '',
                revision: 1,
              });
            }}
          >
            Thêm {title.toLowerCase()}
          </button>
        }
      />
      <div className="admin-toolbar">
        <input
          className="btn"
          placeholder="Tìm tên hoặc slug…"
          aria-label="Tìm danh mục"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
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
      </div>
      {error && (
        <div className="admin-alert danger" role="alert">
          {error}
          <button
            className="btn"
            onClick={() => setRetry((value) => value + 1)}
          >
            Tải lại
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">Đang tải…</p>
      ) : (
        <div className="admin-table-card">
          {!data.items.length ? (
            <p className="admin-empty">Chưa có dữ liệu phù hợp.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Slug</th>
                  <th>Mô tả</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Tên">{item.name}</td>
                    <td data-label="Slug">{item.slug}</td>
                    <td data-label="Mô tả">
                      <span className="line-clamp-2">{item.description}</span>
                    </td>
                    <td className="table-actions">
                      {!deleted && (
                        <button
                          className="btn"
                          onClick={() => {
                            setFormError('');
                            setEdit(item);
                          }}
                        >
                          Sửa
                        </button>
                      )}
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() => trash(item)}
                      >
                        {deleted ? 'Khôi phục' : 'Xóa mềm'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      <nav
        className="mt-4 flex justify-center gap-3"
        aria-label="Phân trang danh mục"
      >
        <button
          className="btn"
          disabled={data.page <= 1 || loading}
          onClick={() => setPage(data.page - 1)}
        >
          Trước
        </button>
        <span className="btn">
          {data.page}/{Math.max(1, data.totalPages)} · {data.total} mục
        </span>
        <button
          className="btn"
          disabled={data.page >= data.totalPages || loading}
          onClick={() => setPage(data.page + 1)}
        >
          Sau
        </button>
      </nav>
      <Modal
        open={Boolean(edit)}
        title={
          edit?.id
            ? `Sửa ${title.toLowerCase()}`
            : `Thêm ${title.toLowerCase()}`
        }
        onClose={() => {
          if (!busy) setEdit(null);
        }}
      >
        {edit && (
          <form
            className="form-section"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy) return;
              setBusy(true);
              setFormError('');
              try {
                await saveTaxonomy(kind, edit);
                setEdit(null);
                setRetry((value) => value + 1);
              } catch (error) {
                setFormError(
                  error instanceof Error ? error.message : 'Không thể lưu.',
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Tên
              <input
                required
                maxLength={120}
                value={edit.name}
                onChange={(event) =>
                  setEdit({ ...edit, name: event.target.value })
                }
              />
            </label>
            <label>
              Slug
              <input
                required
                maxLength={120}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={edit.slug}
                onChange={(event) =>
                  setEdit({ ...edit, slug: event.target.value })
                }
              />
            </label>
            <button
              type="button"
              className="btn"
              onClick={() =>
                setEdit({
                  ...edit,
                  slug: normalizeVi(edit.name)
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, ''),
                })
              }
            >
              Tạo slug từ tên
            </button>
            <label>
              Mô tả
              <textarea
                rows={5}
                maxLength={4000}
                value={edit.description}
                onChange={(event) =>
                  setEdit({ ...edit, description: event.target.value })
                }
              />
            </label>
            {formError && (
              <p className="admin-alert danger" role="alert">
                {formError}
              </p>
            )}
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Đang lưu…' : 'Lưu vào database'}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
