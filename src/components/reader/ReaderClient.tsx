'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Settings, X } from 'lucide-react';
type ComicSettings = { theme: string; width: 'narrow' | 'medium' | 'wide' };
const defaults: ComicSettings = { theme: 'site', width: 'wide' };
export function ReaderClient({
  storyId,
  slug,
  chapter,
  prev,
  next,
}: {
  storyId: string;
  slug: string;
  chapter: number;
  prev: number | null;
  next: number | null;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(defaults);
  const last = useRef(0);
  function apply(value: ComicSettings) {
    const root = document.querySelector<HTMLElement>('[data-reader]');
    if (!root) return;
    root.dataset.readerTheme = value.theme;
    root.style.setProperty(
      '--comic-width',
      value.width === 'narrow'
        ? '640px'
        : value.width === 'medium'
          ? '760px'
          : '900px',
    );
  }
  function update(partial: Partial<ComicSettings>) {
    const value = { ...settings, ...partial };
    setSettings(value);
    localStorage.setItem(
      'comic-reader-settings',
      JSON.stringify({ version: 1, ...value }),
    );
    apply(value);
  }
  useEffect(() => {
    requestAnimationFrame(() => {
      let value = defaults;
      try {
        value = {
          ...defaults,
          ...JSON.parse(localStorage.getItem('comic-reader-settings') || '{}'),
        };
        if (!['site', 'light', 'dark'].includes(value.theme)) {
          value.theme = 'site';
        }
      } catch {}
      setSettings(value);
      apply(value);
      try {
        const data = JSON.parse(
          localStorage.getItem('history') || '{"items":[]}',
        );
        const found = data.items?.find(
          (x: { storyId: string; chapter: number }) =>
            x.storyId === storyId && x.chapter === chapter,
        );
        if (found?.scrollRatio)
          scrollTo(
            0,
            found.scrollRatio *
              (document.documentElement.scrollHeight - innerHeight),
          );
      } catch {}
    });
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input,textarea,select')) return;
      if (e.key === 'ArrowLeft' && prev)
        router.push(`/truyen/${slug}/chap-${prev}`);
      if (e.key === 'ArrowRight' && next)
        router.push(`/truyen/${slug}/chap-${next}`);
    };
    const scroll = () => {
      if (Date.now() - last.current < 1000) return;
      last.current = Date.now();
      const ratio =
        scrollY /
        Math.max(1, document.documentElement.scrollHeight - innerHeight);
      let data = {
        version: 1,
        items: [] as Array<{
          storyId: string;
          slug: string;
          chapter: number;
          scrollRatio: number;
          updatedAt: string;
        }>,
      };
      try {
        data = JSON.parse(
          localStorage.getItem('history') || JSON.stringify(data),
        );
      } catch {}
      data.items = [
        {
          storyId,
          slug,
          chapter,
          scrollRatio: ratio,
          updatedAt: new Date().toISOString(),
        },
        ...(data.items || []).filter((x) => x.storyId !== storyId),
      ].slice(0, 200);
      localStorage.setItem('history', JSON.stringify(data));
      document.documentElement.style.setProperty(
        '--reading-progress',
        `${ratio * 100}%`,
      );
    };
    addEventListener('keydown', key);
    addEventListener('scroll', scroll, { passive: true });
    return () => {
      removeEventListener('keydown', key);
      removeEventListener('scroll', scroll);
    };
  }, [storyId, slug, chapter, prev, next, router]);
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 h-1 bg-[linear-gradient(to_right,var(--accent)_var(--reading-progress,0%),transparent_0)]" />
      <input id="reader-settings-toggle" className="reader-settings-toggle sr-only" type="checkbox" />
      <nav className="fixed bottom-20 left-1/2 z-30 flex -translate-x-1/2 gap-2 rounded-[var(--radius-lg)] border border-border bg-surface p-2">
        {prev ? <Link className="btn" href={`/truyen/${slug}/chap-${prev}`} aria-label="Chapter trước"><ChevronLeft /></Link> : <span className="btn" aria-disabled="true"><ChevronLeft /></span>}
        <label className="btn" htmlFor="reader-settings-toggle" aria-label="Cài đặt đọc truyện tranh"><Settings /></label>
        {next ? <Link className="btn" href={`/truyen/${slug}/chap-${next}`} aria-label="Chapter sau"><ChevronRight /></Link> : <span className="btn" aria-disabled="true"><ChevronRight /></span>}
      </nav>
        <div
          className="reader-settings-panel fixed inset-0 z-50 items-end justify-center bg-[var(--overlay)] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="card w-full max-w-lg p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Cài đặt đọc truyện tranh</h2>
              <label className="btn" htmlFor="reader-settings-toggle" aria-label="Đóng">
                <X />
              </label>
            </div>
            <label className="mt-5 block">
              Nền đọc
              <select
                className="btn mt-2 w-full"
                value={settings.theme}
                onChange={(e) => update({ theme: e.target.value })}
              >
                <option value="site">Theo giao diện website</option>
                <option value="light">Sáng</option>
                <option value="dark">Tối</option>
              </select>
            </label>
            <p className="muted mt-5 text-sm">Độ rộng trang truyện</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['narrow', 'medium', 'wide'] as const).map((x) => (
                <button
                  className={settings.width === x ? 'btn btn-primary' : 'btn'}
                  key={x}
                  onClick={() => update({ width: x })}
                >
                  {x === 'narrow' ? 'Hẹp' : x === 'medium' ? 'Vừa' : 'Rộng'}
                </button>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                className="btn"
                onClick={() => update(defaults)}
              >
                Mặc định
              </button>
              <button
                className="btn bg-error/10 text-error hover:bg-error/20"
                onClick={async () => {
                  const msg = window.prompt('Nhập nội dung báo lỗi (sai chính tả, lỗi ảnh, v.v.):');
                  if (msg) {
                    const { submitReport } = await import('@/app/actions/report');
                    await submitReport(storyId, chapter, msg);
                    alert('Đã gửi báo lỗi thành công. Cảm ơn bạn!');
                  }
                }}
              >
                Báo lỗi chương
              </button>
            </div>
          </div>
        </div>
    </>
  );
}
