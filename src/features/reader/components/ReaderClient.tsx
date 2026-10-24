'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, List, Settings } from 'lucide-react';
import type { ComicPage } from '@/features/catalog/types/chapter';
import {
  getPublishedComic,
  getPublishedChapterNumbers,
} from '@/features/catalog/lib/comicStore';
import { saveProgress } from '@/features/library/lib/storage';
import { useLibrary } from '@/features/library/hooks/useLibrary';
import { setRemoteProgress } from '@/features/library/services/client';
import { Modal } from '@/shared/components/ui/Modal';
import { ChapterContent } from './ChapterContent';
import { AdSlot } from '@/features/advertising/components/AdSlot';
type ComicSettings = {
  theme: 'site' | 'light' | 'dark';
  width: 'narrow' | 'medium' | 'wide';
  autoHide: boolean;
};
const defaults: ComicSettings = {
  theme: 'site',
  width: 'wide',
  autoHide: true,
};
export function ReaderClient({
  storyId,
  slug,
  chapter,
  totalChapters,
  initialPages,
  publishedNumbers,
}: {
  storyId: string;
  slug: string;
  chapter: number;
  totalChapters: number;
  initialPages: ComicPage[];
  publishedNumbers?: number[];
}) {
  const router = useRouter();
  const library = useLibrary();
  const [settings, setSettings] = useState(defaults),
    [panel, setPanel] = useState<'settings' | 'chapters' | 'report' | null>(
      null,
    );
  const [pages, setPages] = useState(initialPages),
    [loaded, setLoaded] = useState(Boolean(publishedNumbers)),
    [error, setError] = useState('');
  const [available, setAvailable] = useState<number[]>(
    publishedNumbers || Array.from({ length: totalChapters }, (_, i) => i + 1),
  );
  const [hidden, setHidden] = useState(false),
    [jump, setJump] = useState(String(chapter)),
    [listPage, setListPage] = useState(
      Math.max(
        0,
        Math.floor(
          (publishedNumbers ? publishedNumbers.indexOf(chapter) : chapter - 1) /
            48,
        ),
      ),
    );
  const [message, setMessage] = useState(''),
    [category, setCategory] = useState('Lỗi ảnh'),
    [reportBusy, setReportBusy] = useState(false),
    [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const panelRef = useRef(panel),
    autoHideRef = useRef(settings.autoHide);
  useEffect(() => {
    panelRef.current = panel;
    autoHideRef.current = settings.autoHide;
  }, [panel, settings.autoHide]);
  const position = available.indexOf(chapter),
    prev = position > 0 ? available[position - 1] : null,
    next = position >= 0 ? available[position + 1] || null : null;
  useEffect(() => {
    // DB readers consume only published snapshots; browser drafts must not override them.
    if (publishedNumbers) return;
    let active = true;
    async function load() {
      try {
        const [published, numbers] = await Promise.all([
          getPublishedComic(storyId, chapter),
          getPublishedChapterNumbers(storyId),
        ]);
        if (!active) return;
        setPages(published?.pages || initialPages);
        const choices = [
          ...new Set([
            ...Array.from({ length: totalChapters }, (_, i) => i + 1),
            ...numbers,
          ]),
        ].sort((a, b) => a - b);
        setAvailable(choices);
        setListPage(Math.max(0, Math.floor(choices.indexOf(chapter) / 48)));
        setError('');
      } catch {
        if (active)
          setError(
            'Không đọc được kho ảnh cục bộ. Nếu đây là chap mới, hãy mở cùng trình duyệt/địa chỉ đã đăng và kiểm tra quyền lưu trữ.',
          );
      } finally {
        if (active) setLoaded(true);
      }
    }
    void load();
    const sync = () => void load();
    const storage = (event: StorageEvent) => {
      if (event.key === 'vuon-comics-revision') sync();
    };
    window.addEventListener('vuon-comics-change', sync);
    window.addEventListener('storage', storage);
    return () => {
      active = false;
      window.removeEventListener('vuon-comics-change', sync);
      window.removeEventListener('storage', storage);
    };
  }, [storyId, chapter, totalChapters, initialPages, retry, publishedNumbers]);
  useEffect(() => {
    let value = defaults;
    try {
      const stored = JSON.parse(
        localStorage.getItem('comic-reader-settings') || '{}',
      );
      value = {
        theme: ['site', 'light', 'dark'].includes(stored.theme)
          ? stored.theme
          : defaults.theme,
        width: ['narrow', 'medium', 'wide'].includes(stored.width)
          ? stored.width
          : defaults.width,
        autoHide: typeof stored.autoHide === 'boolean' ? stored.autoHide : true,
      };
    } catch {
      /* Defaults also work when browser storage is unavailable. */
    }
    setSettings(value);
  }, []);
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-reader]');
    if (!root) return;
    root.dataset.readerTheme = settings.theme;
    root.style.setProperty(
      '--comic-width',
      settings.width === 'narrow'
        ? '640px'
        : settings.width === 'medium'
          ? '760px'
          : '900px',
    );
    if (!settings.autoHide) setHidden(false);
  }, [settings]);
  function update(partial: Partial<ComicSettings>) {
    const value = { ...settings, ...partial };
    setSettings(value);
    try {
      localStorage.setItem(
        'comic-reader-settings',
        JSON.stringify({ version: 1, ...value }),
      );
    } catch {
      setNotice('Đã áp dụng; trình duyệt không cho lưu cài đặt cho lần sau.');
    }
  }
  const hasPages = pages.length > 0;
  useEffect(() => {
    if (!loaded || !hasPages || !library.ready) return;
    let lastWrite = 0,
      previousY = window.scrollY,
      restored = false,
      lastRatio = 0;
    const record = library.history.find(
      (item) => item.storyId === storyId && item.chapter === chapter,
    );
    const save = () => {
      const ratio = Math.min(
        1,
        Math.max(
          0,
          window.scrollY /
            Math.max(
              1,
              document.documentElement.scrollHeight - window.innerHeight,
            ),
        ),
      );
      lastRatio = ratio;
      try {
        const progress = {
          storyId,
          slug,
          chapter,
          scrollRatio: ratio,
          updatedAt: new Date().toISOString(),
        };
        saveProgress(progress, false);
        if (library.remote) void setRemoteProgress(progress).catch(() => {});
      } catch {
        /* Reading should continue if storage is full. */
      }
      document.documentElement.style.setProperty(
        '--reading-progress',
        ratio * 100 + '%',
      );
    };
    const frame = requestAnimationFrame(() => {
      if (record)
        window.scrollTo({
          top:
            record.scrollRatio *
            Math.max(
              0,
              document.documentElement.scrollHeight - window.innerHeight,
            ),
          behavior: 'instant',
        });
      previousY = window.scrollY;
      restored = true;
      save();
    });
    const scroll = () => {
      const currentY = window.scrollY;
      if (!restored) return;
      if (
        autoHideRef.current &&
        !panelRef.current &&
        Math.abs(currentY - previousY) > 6
      ) {
        setHidden(currentY > previousY && currentY > 160);
        previousY = currentY;
      }
      if (Date.now() - lastWrite > 5000) {
        lastWrite = Date.now();
        save();
      }
    };
    const visibility = () => {
      if (document.visibilityState === 'hidden' && restored) save();
    };
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelAnimationFrame(frame);
      // The next route may already have changed the DOM during unmount.
      // Preserve this chapter's last known position, not the new page's offset.
      if (restored)
        try {
          const progress = {
            storyId,
            slug,
            chapter,
            scrollRatio: lastRatio,
            updatedAt: new Date().toISOString(),
          };
          saveProgress(progress, false);
          if (library.remote) void setRemoteProgress(progress).catch(() => {});
        } catch {}
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [
    storyId,
    slug,
    chapter,
    loaded,
    hasPages,
    library.ready,
    library.remote,
    library.history,
  ]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        panel ||
        target.closest(
          'input,textarea,select,button,a,[contenteditable="true"]',
        ) ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      if (event.key === 'ArrowLeft' && prev) {
        event.preventDefault();
        router.push('/truyen/' + slug + '/chap-' + prev);
      }
      if (event.key === 'ArrowRight' && next) {
        event.preventDefault();
        router.push('/truyen/' + slug + '/chap-' + next);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [panel, prev, next, slug, router]);
  function goToChap(event: React.FormEvent) {
    event.preventDefault();
    const number = Number(jump);
    if (!Number.isSafeInteger(number) || !available.includes(number)) {
      setNotice('Số chap không có trong danh sách đã đăng.');
      return;
    }
    setPanel(null);
    router.push('/truyen/' + slug + '/chap-' + number);
  }
  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-50 h-1 bg-[linear-gradient(to_right,var(--accent)_var(--reading-progress,0%),transparent_0)]"
      />
      <header className="mx-auto max-w-[900px] px-4 pb-8 text-center">
        <Link href={'/truyen/' + slug} className="text-sm text-accent">
          Về trang truyện
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Chap {chapter}</h1>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {prev && (
            <Link className="btn" href={'/truyen/' + slug + '/chap-' + prev}>
              ← Chap trước
            </Link>
          )}
          <button
            className="btn"
            onClick={() => {
              setNotice('');
              setPanel('chapters');
            }}
          >
            Danh sách chap
          </button>
          {next && (
            <Link className="btn" href={'/truyen/' + slug + '/chap-' + next}>
              Chap sau →
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-[900px]">
        {error && (
          <div className="reader-error" role="alert">
            <p>{error}</p>
            <button
              className="btn"
              onClick={() => setRetry((value) => value + 1)}
            >
              Thử lại kho ảnh
            </button>
          </div>
        )}
        {!hasPages ? (
          <div className="reader-error" role="status">
            {loaded
              ? 'Chap chưa được đăng trên trình duyệt này.'
              : 'Đang tải ảnh chap…'}
            <Link className="btn" href={'/truyen/' + slug}>
              Về trang truyện
            </Link>
          </div>
        ) : (
          <>
            <div
              onClick={(event) => {
                if (!(event.target as HTMLElement).closest('a,button,input'))
                  setHidden(false);
              }}
            >
              <ChapterContent pages={pages} />
            </div>
            <div className="px-4">
              <AdSlot placement="chapter-end" />
              <div className="mt-8 flex justify-between gap-3">
                {prev && (
                  <Link
                    className="btn"
                    href={'/truyen/' + slug + '/chap-' + prev}
                  >
                    ← Chap trước
                  </Link>
                )}
                <Link
                  className="btn btn-primary"
                  href={
                    next
                      ? '/truyen/' + slug + '/chap-' + next
                      : '/truyen/' + slug
                  }
                >
                  {next ? 'Chap sau →' : 'Về trang truyện'}
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
      {hidden && (
        <button
          className="btn reader-show-tools"
          aria-label="Hiện công cụ đọc"
          onClick={() => setHidden(false)}
        >
          <Settings size={20} />
        </button>
      )}
      <nav
        aria-label="Công cụ đọc truyện"
        className={
          'reader-tools fixed bottom-20 left-1/2 z-30 flex -translate-x-1/2 gap-2 rounded-[var(--radius-lg)] border border-border bg-surface p-2' +
          (hidden ? ' is-hidden' : '')
        }
        inert={hidden}
      >
        {prev ? (
          <Link
            className="btn"
            href={'/truyen/' + slug + '/chap-' + prev}
            aria-label="Chap trước"
          >
            <ChevronLeft />
          </Link>
        ) : (
          <button className="btn" disabled aria-label="Không có chap trước">
            <ChevronLeft />
          </button>
        )}
        <button
          className="btn"
          aria-label="Cài đặt đọc"
          onClick={() => {
            setNotice('');
            setPanel('settings');
          }}
        >
          <Settings />
        </button>
        <button
          className="btn"
          aria-label="Chọn chap"
          onClick={() => {
            setNotice('');
            setPanel('chapters');
          }}
        >
          <List />
        </button>
        {next ? (
          <Link
            className="btn"
            href={'/truyen/' + slug + '/chap-' + next}
            aria-label="Chap sau"
          >
            <ChevronRight />
          </Link>
        ) : (
          <button className="btn" disabled aria-label="Không có chap sau">
            <ChevronRight />
          </button>
        )}
      </nav>
      <Modal
        open={panel === 'settings'}
        title="Cài đặt đọc truyện tranh"
        onClose={() => setPanel(null)}
      >
        <label className="mt-4 block">
          Nền đọc
          <select
            className="btn mt-2 w-full"
            value={settings.theme}
            onChange={(event) =>
              update({ theme: event.target.value as ComicSettings['theme'] })
            }
          >
            <option value="site">Theo website</option>
            <option value="light">Sáng</option>
            <option value="dark">Tối</option>
          </select>
        </label>
        <p className="muted mt-5">Độ rộng trang truyện</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(['narrow', 'medium', 'wide'] as const).map((width) => (
            <button
              className={settings.width === width ? 'btn btn-primary' : 'btn'}
              aria-pressed={settings.width === width}
              key={width}
              onClick={() => update({ width })}
            >
              {width === 'narrow' ? 'Hẹp' : width === 'medium' ? 'Vừa' : 'Rộng'}
            </button>
          ))}
        </div>
        <label className="mt-5 flex gap-3">
          <input
            type="checkbox"
            checked={settings.autoHide}
            onChange={(event) => update({ autoHide: event.target.checked })}
          />
          Ẩn công cụ khi cuộn xuống; chạm ảnh để hiện lại
        </label>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn" onClick={() => update(defaults)}>
            Mặc định
          </button>
          <button
            className="btn"
            onClick={() => {
              setNotice('');
              setPanel('report');
            }}
          >
            Báo lỗi chap
          </button>
        </div>
        {notice && (
          <p role="status" className="muted mt-4">
            {notice}
          </p>
        )}
      </Modal>
      <Modal
        open={panel === 'chapters'}
        title="Chọn chap"
        onClose={() => setPanel(null)}
      >
        <form onSubmit={goToChap} className="mt-4 flex gap-2">
          <label className="min-w-0 flex-1">
            Số chap
            <input
              className="btn mt-2 w-full"
              inputMode="numeric"
              type="number"
              min="1"
              value={jump}
              onChange={(event) => setJump(event.target.value)}
            />
          </label>
          <button className="btn self-end">Đi tới</button>
        </form>
        {notice && (
          <p role="alert" className="muted mt-3">
            {notice}
          </p>
        )}
        <div className="chapter-jump-grid">
          {available.slice(listPage * 48, listPage * 48 + 48).map((number) => (
            <Link
              key={number}
              aria-current={number === chapter ? 'page' : undefined}
              className={number === chapter ? 'btn btn-primary' : 'btn'}
              href={'/truyen/' + slug + '/chap-' + number}
              onClick={() => setPanel(null)}
            >
              Chap {number}
            </Link>
          ))}
        </div>
        <div className="mt-4 flex justify-between gap-2">
          <button
            className="btn"
            disabled={listPage <= 0}
            onClick={() => setListPage((value) => value - 1)}
          >
            Trước
          </button>
          <span className="muted self-center">
            {listPage + 1}/{Math.max(1, Math.ceil(available.length / 48))}
          </span>
          <button
            className="btn"
            disabled={(listPage + 1) * 48 >= available.length}
            onClick={() => setListPage((value) => value + 1)}
          >
            Sau
          </button>
        </div>
      </Modal>
      <Modal
        open={panel === 'report'}
        title={'Báo lỗi chap ' + chapter}
        onClose={() => {
          if (!reportBusy) setPanel(null);
        }}
      >
        <form
          className="mt-4 grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (reportBusy) return;
            setReportBusy(true);
            setNotice('');
            try {
              const { submitReport } =
                await import('@/features/reader/actions/report');
              await submitReport(
                storyId,
                chapter,
                category + ': ' + message.trim(),
              );
              setMessage('');
              setNotice('Đã gửi báo lỗi tới quản trị viên.');
            } catch (failure) {
              setNotice((failure as Error).message || 'Chưa gửi được báo lỗi. Hãy thử lại.');
            } finally {
              setReportBusy(false);
            }
          }}
        >
          <label>
            Loại lỗi
            <select
              className="btn mt-2 w-full"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {[
                'Lỗi ảnh',
                'Thiếu ảnh',
                'Sai thứ tự ảnh',
                'Sai chap',
                'Khác',
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Mô tả
            <textarea
              className="btn mt-2 w-full text-left"
              rows={4}
              minLength={5}
              maxLength={1000}
              required
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </label>
          <button
            className="btn btn-primary"
            disabled={reportBusy || message.trim().length < 5}
          >
            {reportBusy ? 'Đang gửi…' : 'Gửi báo lỗi'}
          </button>
          {notice && <p role="status">{notice}</p>}
        </form>
      </Modal>
    </>
  );
}
