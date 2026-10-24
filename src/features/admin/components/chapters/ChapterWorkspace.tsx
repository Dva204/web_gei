'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Save } from 'lucide-react';
import {
  getChapterAdmin,
  listChaptersAdmin,
  saveChapter,
  publicationAction,
  deleteChapter,
  listVersions,
  restoreVersion,
} from '../../services/chapters';
import { getStoryAdmin } from '../../services/stories';
import { getAdminSession } from '../../services/auth';
import { can } from '../../lib/permissions';
import type { ChapterAdmin, ChapterVersion, StoryAdmin } from '../../types';
import { PageHeader, StatusBadge } from '../common/AdminUI';
import { ComicPagesEditor } from './ComicPagesEditor';
import { Modal } from '@/shared/components/ui/Modal';
export function ChapterList({ storyId }: { storyId: string }) {
  const [items, setItems] = useState<ChapterAdmin[]>([]),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    listChaptersAdmin(storyId, { status, page, pageSize: 20 })
      .then((data) => {
        if (active) {
          setItems(data.items);
          setTotal(data.totalPages);
          setPage(data.page);
          setError('');
        }
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [storyId, status, page, retry]);
  return (
    <>
      <PageHeader
        title="Danh sách chap"
        description="Nháp và snapshot xuất bản lưu trên máy chủ."
        actions={
          <Link
            className="btn btn-primary"
            href={`/admin/truyen/${storyId}/chuong/moi`}
          >
            <Plus size={17} />
            Thêm chap
          </Link>
        }
      />
      <label className="admin-toolbar">
        Trạng thái
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả</option>
          <option value="draft">Bản nháp</option>
          <option value="ready">Sẵn sàng</option>
          <option value="published">Đã xuất bản</option>
          <option value="scheduled">Đã lên lịch</option>
        </select>
      </label>
      {error && (
        <p className="admin-alert danger" role="alert">
          {error}
          <button
            className="btn"
            onClick={() => setRetry((value) => value + 1)}
          >
            Thử lại
          </button>
        </p>
      )}
      {loading ? (
        <p role="status">Đang tải chap…</p>
      ) : (
        <div className="admin-list">
          {!items.length && (
            <p className="admin-empty">Chưa có chap phù hợp.</p>
          )}
          {items.map((chapter) => (
            <article className="admin-list-row" key={chapter.id}>
              <div className="list-main">
                <strong>Chap {chapter.number}</strong>
                <small>
                  {chapter.pageCount || 0} ảnh ·{' '}
                  {chapter.hasPublication
                    ? 'Có bản công khai'
                    : 'Chưa công khai'}
                  {chapter.publishAt
                    ? ' · Lịch: ' +
                      new Date(chapter.publishAt).toLocaleString('vi-VN')
                    : ''}
                </small>
              </div>
              <StatusBadge value={chapter.status} />
              <Link
                className="btn"
                href={`/admin/truyen/${storyId}/chuong/${chapter.number}`}
              >
                Quản lý ảnh
              </Link>
            </article>
          ))}
        </div>
      )}
      <nav
        className="mt-4 flex justify-center gap-3"
        aria-label="Phân trang chap"
      >
        <button
          className="btn"
          disabled={loading || page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Trước
        </button>
        <span className="btn">
          {page}/{Math.max(1, total)}
        </span>
        <button
          className="btn"
          disabled={loading || page >= total}
          onClick={() => setPage(page + 1)}
        >
          Sau
        </button>
      </nav>
    </>
  );
}
export function ChapterEditor({
  storyId,
  number,
}: {
  storyId: string;
  number?: number;
}) {
  const router = useRouter(),
    lock = useRef(false);
  const [item, setItem] = useState<ChapterAdmin | null>(null),
    [story, setStory] = useState<StoryAdmin | null>(null);
  const [busy, setBusy] = useState(false),
    [imageBusy, setImageBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [retry, setRetry] = useState(0);
  const [action, setAction] = useState<
      'publish' | 'unpublish' | 'schedule' | null
    >(null),
    [scheduleAt, setScheduleAt] = useState(''),
    [versions, setVersions] = useState<ChapterVersion[] | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([
      getStoryAdmin(storyId),
      number
        ? getChapterAdmin(storyId, number)
        : listChaptersAdmin(storyId, { pageSize: 1 }).then((result) => ({
            storyId,
            number: result.nextNumber,
            title: '',
            content: '',
            pages: [],
            wordCount: 0,
            status: 'draft' as const,
            updatedAt: '',
            updatedBy: '',
          })),
    ])
      .then(([story, chapter]) => {
        if (active) {
          setStory(story);
          setItem(chapter);
          setDirty(false);
          setError('');
        }
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [storyId, number, retry]);
  const save = useCallback(
    async (status: 'draft' | 'ready' = 'draft', navigate = true) => {
      if (!item || lock.current || imageBusy) return null;
      lock.current = true;
      setBusy(true);
      setError('');
      try {
        const saved = await saveChapter({ ...item, status });
        setItem(saved);
        setDirty(false);
        setNotice('Đã lưu bản nháp lên máy chủ. Bản công khai không thay đổi.');
        if (!item.id && navigate)
          router.replace(`/admin/truyen/${storyId}/chuong/${saved.number}`);
        return saved;
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Không thể lưu.');
        return null;
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    [item, imageBusy, router, storyId],
  );
  useEffect(() => {
    if (!dirty || !item || busy || imageBusy || error) return;
    const timer = window.setTimeout(() => void save(), 1800);
    return () => window.clearTimeout(timer);
  }, [dirty, item, busy, imageBusy, error, save]);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (dirty || imageBusy) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener('beforeunload', before);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('beforeunload', before);
      window.removeEventListener('keydown', key);
    };
  }, [dirty, imageBusy, save]);
  async function publishAction(
    kind: 'publish' | 'unpublish' | 'schedule' | 'cancel',
  ) {
    if (!item || busy || imageBusy || lock.current) return;
    let current = item;
    if (kind === 'publish' || kind === 'schedule') {
      const saved = await save('ready', false);
      if (!saved) return;
      current = saved;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = await publicationAction(
        current,
        kind,
        kind === 'schedule' ? new Date(scheduleAt).toISOString() : undefined,
      );
      setItem(saved);
      setDirty(false);
      setAction(null);
      if (!number)
        router.replace(`/admin/truyen/${storyId}/chuong/${saved.number}`);
      setNotice(
        kind === 'publish'
          ? 'Đã xuất bản snapshot lên trang đọc.'
          : kind === 'schedule'
            ? 'Đã lưu lịch đăng trên máy chủ. Worker publish-due cần được chạy để đăng đúng lịch.'
            : 'Đã cập nhật trạng thái xuất bản.',
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không thể cập nhật.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!item || !story)
    return (
      <div className="admin-card p-5">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button
              className="btn"
              onClick={() => setRetry((value) => value + 1)}
            >
              Tải lại
            </button>
          </>
        ) : (
          'Đang tải…'
        )}
      </div>
    );
  const mayPublish = can(getAdminSession(), 'chapters.publish'),
    locked = busy || imageBusy;
  return (
    <>
      <PageHeader
        title={`Chap ${item.number}`}
        description={`${item.pages?.length || 0} ảnh · Không bắt buộc tên chap`}
        actions={
          <button
            className="btn btn-primary"
            disabled={locked}
            onClick={() => void save()}
          >
            <Save size={17} />
            {busy ? 'Đang lưu…' : 'Lưu nháp'}
          </button>
        }
      />
      <p className="admin-alert">
        Ảnh/nháp đã lưu trên backend. Sửa nháp không đổi snapshot công khai. Tự
        lưu sau khi ngừng chỉnh sửa khoảng 2 giây; không tự xuất bản.
      </p>
      {error && (
        <p className="admin-alert danger" role="alert">
          {error}
          <button
            className="btn"
            disabled={locked}
            onClick={() => {
              if (
                dirty &&
                !window.confirm('Tải lại sẽ bỏ thay đổi chưa lưu. Tiếp tục?')
              )
                return;
              setRetry((value) => value + 1);
            }}
          >
            Tải lại bản máy chủ
          </button>
        </p>
      )}
      {notice && (
        <p className="admin-alert success" role="status">
          {notice}
        </p>
      )}
      <fieldset disabled={locked} className="admin-toolbar">
        <StatusBadge value={item.status} />
        {item.hasPublication && (
          <span className="chip">
            {item.publicationRevision === item.revision
              ? 'Đã đồng bộ bản công khai'
              : 'Có thay đổi chưa xuất bản'}
          </span>
        )}
        {!item.id && (
          <label>
            Số chap
            <input
              className="btn w-28"
              type="number"
              min="1"
              max="1000000"
              value={item.number}
              onChange={(event) => {
                setItem({ ...item, number: Number(event.target.value) });
                setDirty(true);
              }}
            />
          </label>
        )}
        <button className="btn" onClick={() => void save('ready')}>
          Đánh dấu sẵn sàng
        </button>
        {mayPublish && (
          <>
            <button
              className="btn"
              disabled={!item.pages?.length}
              onClick={() => setAction('publish')}
            >
              Xuất bản / cập nhật
            </button>
            <button
              className="btn"
              disabled={!item.pages?.length}
              onClick={() => setAction('schedule')}
            >
              Lên lịch
            </button>
            {item.hasPublication && (
              <button className="btn" onClick={() => setAction('unpublish')}>
                Gỡ bản công khai
              </button>
            )}
            {item.publishAt && (
              <button
                className="btn"
                onClick={() => void publishAction('cancel')}
              >
                Hủy lịch
              </button>
            )}
          </>
        )}
        {item.id && (
          <button
            className="btn"
            onClick={async () => {
              try {
                setVersions(await listVersions(storyId, item.number));
              } catch (error) {
                setError((error as Error).message);
              }
            }}
          >
            Các phiên bản
          </button>
        )}
        {item.hasPublication && story.visibility === 'public' && (
          <Link
            className="btn"
            target="_blank"
            rel="noopener"
            href={`/truyen/${story.slug}/chap-${item.number}`}
          >
            Mở bản công khai
          </Link>
        )}
        <Link className="btn" href={`/admin/truyen/${storyId}/chuong`}>
          Danh sách chap
        </Link>
      </fieldset>
      <div className="comic-admin-grid">
        <section className="admin-card p-4">
          <ComicPagesEditor
            storyId={storyId}
            disabled={busy}
            pages={item.pages || []}
            onBusyChange={setImageBusy}
            onChange={(pages) => {
              setItem({ ...item, pages });
              setDirty(true);
              setError('');
            }}
          />
        </section>
        <section className="admin-card p-4">
          <h2 className="mb-4 font-semibold">Xem trước nháp</h2>
          <div className="comic-preview">
            {item.pages?.map((page) => (
              <Image
                key={page.id}
                src={page.image}
                width={page.width}
                height={page.height}
                alt={page.alt}
                unoptimized
              />
            ))}
          </div>
        </section>
      </div>
      {mayPublish && item.id && (
        <button
          className="btn mt-4"
          disabled={locked}
          onClick={async () => {
            if (
              !window.confirm(
                'Xóa mềm chap này và gỡ khỏi trang đọc? Ảnh và lịch sử phiên bản vẫn được giữ.',
              )
            )
              return;
            setBusy(true);
            lock.current = true;
            try {
              await deleteChapter(item);
              setDirty(false);
              router.replace(`/admin/truyen/${storyId}/chuong`);
            } catch (error) {
              setError((error as Error).message);
            } finally {
              setBusy(false);
              lock.current = false;
            }
          }}
        >
          Xóa mềm chap
        </button>
      )}
      <Modal
        open={Boolean(action)}
        title={
          action === 'schedule'
            ? 'Lên lịch xuất bản'
            : action === 'unpublish'
              ? 'Gỡ bản công khai?'
              : 'Xuất bản snapshot?'
        }
        onClose={() => {
          if (!locked) setAction(null);
        }}
      >
        <p className="muted my-4">
          {action === 'unpublish'
            ? 'Chap sẽ không còn đọc được công khai. Nháp và phiên bản vẫn giữ.'
            : 'Cần truyện công khai và quyền sử dụng hợp lệ. Nội dung nháp sẽ được lưu trước khi thực hiện.'}
        </p>
        {action === 'schedule' && (
          <label>
            Thời gian đăng
            <input
              className="btn my-4 w-full"
              type="datetime-local"
              value={scheduleAt}
              onChange={(event) => setScheduleAt(event.target.value)}
            />
          </label>
        )}
        <button
          className="btn btn-primary"
          disabled={locked || (action === 'schedule' && !scheduleAt)}
          onClick={() => action && void publishAction(action)}
        >
          Xác nhận
        </button>
      </Modal>
      <Modal
        open={versions !== null}
        title="Phiên bản nháp"
        onClose={() => {
          if (!locked) setVersions(null);
        }}
      >
        {!versions?.length && (
          <p className="muted my-4">Chưa có phiên bản trước đó.</p>
        )}
        {versions?.map((version) => (
          <div
            className="my-3 flex items-center justify-between gap-3"
            key={version.id}
          >
            <span>
              {new Date(version.savedAt).toLocaleString('vi-VN')} ·{' '}
              {version.pageCount} ảnh
              <small className="block muted">{version.note}</small>
            </span>
            <button
              className="btn"
              disabled={locked}
              onClick={async () => {
                if (
                  !window.confirm(
                    'Khôi phục phiên bản thành nháp? Thay đổi chưa lưu sẽ được bỏ, bản công khai không đổi.',
                  )
                )
                  return;
                setBusy(true);
                lock.current = true;
                try {
                  const saved = await restoreVersion(item, version.id);
                  setItem(saved);
                  setDirty(false);
                  setVersions(null);
                  setNotice(
                    'Đã khôi phục nháp trên máy chủ. Chưa xuất bản lại.',
                  );
                } catch (error) {
                  setError((error as Error).message);
                } finally {
                  lock.current = false;
                  setBusy(false);
                }
              }}
            >
              Khôi phục
            </button>
          </div>
        ))}
      </Modal>
    </>
  );
}
