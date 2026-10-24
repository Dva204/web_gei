'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { uploadComicImages } from '@/features/admin/services/chapters';
import { getStoryAdmin, saveStory } from '@/features/admin/services/stories';
import {
  taxonomyOptions,
  type TaxonomyItem,
} from '@/features/admin/services/taxonomy';
import { getAdminSession } from '@/features/admin/services/auth';
import { can } from '@/features/admin/lib/permissions';
import type { RightsType, StoryAdmin } from '@/features/admin/types';
import { PageHeader } from '@/features/admin/components/common/AdminUI';
import { normalizeVi } from '@/shared/lib/utils/normalizeVi';
import { AssignmentEditor } from './AssignmentEditor';

const freshStory = (): StoryAdmin => ({
  id: '',
  slug: '',
  title: '',
  author: '',
  genres: [],
  genreIds: [],
  synopsis: '',
  status: 'ongoing',
  visibility: 'draft',
  featured: false,
  assigneeIds: [],
  rating: 0,
  ratingCount: 0,
  views: 0,
  totalChapters: 0,
  latestChapter: 0,
  createdAt: '',
  updatedAt: '',
});
export function StoryForm({ id }: { id?: string }) {
  const router = useRouter();
  const [openedAt] = useState(() => Date.now());
  const [item, setItem] = useState<StoryAdmin | null>(id ? null : freshStory);
  const [authors, setAuthors] = useState<TaxonomyItem[]>([]),
    [genres, setGenres] = useState<TaxonomyItem[]>([]);
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      id ? getStoryAdmin(id) : Promise.resolve(freshStory()),
      taxonomyOptions('authors'),
      taxonomyOptions('genres'),
    ])
      .then(([story, authors, genres]) => {
        if (active) {
          setItem(story);
          setAuthors(authors);
          setGenres(genres);
          setMessage('');
        }
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, retry]);
  if (loading) return <p role="status">Đang tải thông tin từ máy chủ…</p>;
  if (!item)
    return (
      <div className="admin-alert danger">
        {message || 'Không tìm thấy truyện.'}
        <button className="btn" onClick={() => setRetry((value) => value + 1)}>
          Tải lại
        </button>
      </div>
    );
  const user = getAdminSession(),
    mayPublish = can(user, 'stories.publish');
  const editable =
    !item.deletedAt &&
    (mayPublish || (user?.role === 'author' && item.visibility === 'draft'));
  const validRights = Boolean(
    item.rightsType &&
    (item.rightsType === 'own' || item.rightsNote?.trim()) &&
    (!item.rightsExpiresAt || +new Date(item.rightsExpiresAt) > openedAt),
  );
  const change = (patch: Partial<StoryAdmin>) => setItem({ ...item, ...patch });
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !item) return;
    setBusy(true);
    setMessage('');
    try {
      const saved = await saveStory(item);
      setItem(saved);
      setMessage('Đã lưu vào database.');
      if (!id) router.replace('/admin/truyen/' + saved.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <PageHeader
        title={id ? 'Thông tin truyện' : 'Thêm truyện mới'}
        description="Dữ liệu được lưu trên PostgreSQL. Tên chap không bắt buộc."
        actions={
          editable ? (
            <button className="btn btn-primary" disabled={busy}>
              <Save size={17} />
              {busy ? 'Đang lưu…' : 'Lưu truyện'}
            </button>
          ) : undefined
        }
      />
      {message && (
        <div
          className={`admin-alert ${message.startsWith('Đã') ? 'success' : 'danger'}`}
          role="status"
        >
          {message}
          <button
            type="button"
            className="btn"
            onClick={() => setRetry((value) => value + 1)}
          >
            Tải lại dữ liệu
          </button>
        </div>
      )}
      {!editable && (
        <p className="admin-alert">
          Truyện hiện chỉ xem. Biên tập viên quản lý truyện công khai và thùng
          rác.
        </p>
      )}
      <p className="admin-alert">
        Lưu truyện trước, sau đó upload ảnh và tạo chap. Chỉ snapshot được xuất
        bản mới xuất hiện trên trang đọc; dữ liệu FE cũ không tự nhập vào DB.
        {item.id && !item.deletedAt && (
          <Link className="btn ml-3" href={`/admin/truyen/${item.id}/chuong`}>
            Quản lý chap
          </Link>
        )}
      </p>
      <fieldset disabled={!editable || busy} className="admin-form-grid">
        <section className="admin-card form-section">
          <h2>Thông tin cơ bản</h2>
          <label>
            Tên truyện
            <input
              required
              maxLength={180}
              value={item.title}
              onChange={(event) => change({ title: event.target.value })}
            />
          </label>
          <label>
            Slug
            <div className="flex gap-2">
              <input
                required
                value={item.slug}
                maxLength={120}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                onChange={(event) => change({ slug: event.target.value })}
              />
              <button
                type="button"
                className="btn"
                onClick={() =>
                  change({
                    slug: normalizeVi(item.title)
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, '')
                      .slice(0, 120)
                      .replace(/-$/, ''),
                  })
                }
              >
                Tạo từ tên
              </button>
            </div>
          </label>
          <label>
            Tác giả
            <select
              value={item.authorId || ''}
              onChange={(event) =>
                change({ authorId: event.target.value || undefined })
              }
            >
              <option value="">Chưa chọn tác giả</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Thể loại (tối đa 12)</legend>
            <div className="flex flex-wrap gap-3">
              {genres.map((genre) => (
                <label key={genre.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.genreIds?.includes(genre.id) || false}
                    onChange={(event) =>
                      change({
                        genreIds: event.target.checked
                          ? [...(item.genreIds || []), genre.id]
                          : item.genreIds?.filter((id) => id !== genre.id),
                      })
                    }
                  />
                  {genre.name}
                </label>
              ))}
            </div>
            {!genres.length && (
              <small>
                Tạo thể loại ở mục Thể loại trước khi gán cho truyện.
              </small>
            )}
          </fieldset>
          <label>
            Tóm tắt
            <textarea
              rows={7}
              maxLength={8000}
              value={item.synopsis}
              onChange={(event) => change({ synopsis: event.target.value })}
            />
          </label>
          <div className="form-two">
            <label>
              Trạng thái
              <select
                value={item.status}
                onChange={(event) =>
                  change({ status: event.target.value as StoryAdmin['status'] })
                }
              >
                <option value="ongoing">Đang ra</option>
                <option value="full">Hoàn thành</option>
                <option value="paused">Tạm dừng</option>
              </select>
            </label>
            <label>
              Hiển thị
              <select
                disabled={!mayPublish}
                value={item.visibility}
                onChange={(event) =>
                  change({
                    visibility: event.target.value as StoryAdmin['visibility'],
                  })
                }
              >
                <option value="draft">Bản nháp</option>
                <option value="hidden">Ẩn</option>
                <option value="public" disabled={!validRights}>
                  Công khai
                </option>
              </select>
            </label>
          </div>
          <label>
            Kết thúc
            <select
              value={item.ending || ''}
              onChange={(event) =>
                change({
                  ending:
                    (event.target.value as StoryAdmin['ending']) || undefined,
                })
              }
            >
              <option value="">Chưa chọn</option>
              <option>HE</option>
              <option>SE</option>
              <option>OE</option>
            </select>
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              disabled={!mayPublish}
              checked={item.featured}
              onChange={(event) => change({ featured: event.target.checked })}
            />
            Truyện nổi bật
          </label>
        </section>
        <aside>
          <section className="admin-card form-section">
            <h2>Ảnh bìa</h2>
            {item.cover && (
              <Image
                src={item.cover}
                width={180}
                height={270}
                alt={item.title}
                unoptimized
                className="rounded-xl object-cover"
              />
            )}
            {item.id ? (
              <label>
                Upload bìa (JPG/PNG/WebP, tối đa 10 MB)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={async (event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = '';
                    if (!file || busy) return;
                    setBusy(true);
                    setMessage('');
                    try {
                      const [cover] = await uploadComicImages(
                        item.id,
                        [file],
                        'covers',
                      );
                      setItem((current) =>
                        current
                          ? {
                              ...current,
                              cover: cover.image,
                              coverStorageKey: cover.storageKey,
                            }
                          : current,
                      );
                      setMessage(
                        'Đã upload bìa. Bấm Lưu truyện để áp dụng bìa mới.',
                      );
                    } catch (error) {
                      setMessage(
                        error instanceof Error
                          ? error.message
                          : 'Không thể upload bìa.',
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </label>
            ) : (
              <p className="muted">Lưu truyện lần đầu để bật upload bìa.</p>
            )}
            {item.coverStorageKey && (
              <button
                type="button"
                className="btn"
                onClick={() =>
                  change({ cover: undefined, coverStorageKey: undefined })
                }
              >
                Bỏ bìa (cần lưu truyện)
              </button>
            )}
          </section>
          <section className="admin-card form-section">
            <h2>Quyền sử dụng</h2>
            <label>
              Loại quyền
              <select
                value={item.rightsType || ''}
                onChange={(event) =>
                  change({
                    rightsType: (event.target.value as RightsType) || undefined,
                  })
                }
              >
                <option value="">Chưa khai báo</option>
                <option value="own">Nội dung tự sáng tác</option>
                <option value="agreement">Có thỏa thuận</option>
                <option value="public_domain">Miền công cộng</option>
                <option value="open_license">Giấy phép mở</option>
                <option value="other">Khác</option>
              </select>
            </label>
            <label>
              Minh chứng
              <textarea
                rows={4}
                maxLength={4000}
                value={item.rightsNote || ''}
                onChange={(event) => change({ rightsNote: event.target.value })}
                placeholder="Nguồn nội dung, giấy phép hoặc thông tin thỏa thuận"
              />
            </label>
            <label>
              Ngày hết hạn quyền (nếu có)
              <input
                type="date"
                value={item.rightsExpiresAt?.slice(0, 10) || ''}
                onChange={(event) =>
                  change({
                    rightsExpiresAt: event.target.value
                      ? event.target.value + 'T23:59:59.999Z'
                      : undefined,
                  })
                }
              />
            </label>
            <p className="muted">
              {validRights
                ? 'Thông tin quyền hợp lệ. Truyện chỉ xuất hiện ở user sau khi có chap xuất bản.'
                : 'Cần khai báo quyền hợp lệ trước khi công khai.'}
            </p>
          </section>
          <section className="admin-card form-section">
            <h2>SEO riêng</h2>
            <label>
              Tiêu đề SEO
              <input
                maxLength={60}
                value={item.seoTitle || ''}
                onChange={(event) => change({ seoTitle: event.target.value })}
              />
            </label>
            <label>
              Mô tả SEO
              <textarea
                maxLength={160}
                rows={4}
                value={item.seoDescription || ''}
                onChange={(event) =>
                  change({ seoDescription: event.target.value })
                }
              />
            </label>
          </section>
        </aside>
      </fieldset>
      {id && mayPublish && !item.deletedAt && (
        <AssignmentEditor
          story={item}
          disabled={busy}
          onSaved={(saved) =>
            setItem((current) =>
              current
                ? {
                    ...current,
                    assigneeIds: saved.assigneeIds,
                    revision: saved.revision,
                  }
                : saved,
            )
          }
        />
      )}
    </form>
  );
}
