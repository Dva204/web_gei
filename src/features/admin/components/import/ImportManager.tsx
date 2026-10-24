'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PageHeader } from '../common/AdminUI';
import { listStoriesAdmin } from '../../services/stories';
import { listChaptersAdmin, uploadComicImages } from '../../services/chapters';
import {
  previewImageImport,
  commitImageImport,
  type ImageImportPreview,
} from '../../services/importer';
import { chapterNumberFromPath } from '../../lib/importImages';
import type { StoryAdmin } from '../../types';
export function ImportManager() {
  const [stories, setStories] = useState<StoryAdmin[]>([]),
    [search, setSearch] = useState(''),
    [storyId, setStoryId] = useState('');
  const [nextNumber, setNextNumber] = useState(1),
    [data, setData] = useState<ImageImportPreview | null>(null),
    [target, setTarget] = useState<'draft' | 'ready'>('draft');
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [checking, setChecking] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      listStoriesAdmin({ pageSize: 100, search })
        .then((result) => {
          if (active) {
            setStories(result.items);
            setStoryId((previous) =>
              result.items.some((story) => story.id === previous)
                ? previous
                : result.items[0]?.id || '',
            );
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
  }, [search]);
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    setNotice('');
    setChecking(Boolean(storyId));
    if (storyId)
      listChaptersAdmin(storyId, { pageSize: 1 })
        .then((result) => {
          if (active) setNextNumber(result.nextNumber);
        })
        .catch((error) => {
          if (active) setError(error.message);
        })
        .finally(() => {
          if (active) setChecking(false);
        });
    return () => {
      active = false;
    };
  }, [storyId]);
  async function preview(files: File[]) {
    if (!files.length || busy || !storyId || checking) return;
    setBusy(true);
    setData(null);
    setError('');
    setNotice('');
    try {
      if (
        files.length > 600 ||
        files.reduce((sum, file) => sum + file.size, 0) > 100 * 1024 * 1024
      )
        throw new Error('Mỗi lần chọn tối đa 600 ảnh và 100 MB.');
      const groups = new Map<number, File[]>();
      for (const file of files) {
        const number =
          chapterNumberFromPath(file.webkitRelativePath || file.name) ||
          nextNumber;
        groups.set(number, [...(groups.get(number) || []), file]);
      }
      if (
        groups.size > 20 ||
        [...groups.values()].some((group) => group.length > 300)
      )
        throw new Error('Mỗi lần nhập tối đa 20 chap và 300 ảnh/chap.');
      const chapters = [];
      for (const [number, group] of [...groups].sort(([a], [b]) => a - b)) {
        setNotice('Đang upload ảnh chap ' + number + '…');
        chapters.push({
          number,
          pages: await uploadComicImages(storyId, group),
        });
      }
      setData(await previewImageImport(storyId, chapters));
      setNotice(
        'Đã upload và phân tích trên máy chủ. Chưa tạo chap; hãy kiểm tra bản xem trước.',
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Không thể phân tích.');
    } finally {
      setBusy(false);
    }
  }
  const chosen = data?.chapters.filter((row) => row.selected) || [],
    hasErrors = chosen.some((row) => row.warnings.length);
  return (
    <>
      <PageHeader
        title="Nhập ảnh nhiều chap"
        description="Upload → xem trước server → chọn chap → tạo nháp trong một transaction."
      />
      <p className="admin-alert">
        Ảnh và bản xem trước lưu trên máy chủ. Tối đa 20 chap/600 ảnh/lần; không
        nhập đè, không tự xuất bản. Bản xem trước hết hạn sau 2 giờ.
      </p>
      {error && (
        <p className="admin-alert danger" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="admin-alert" role="status">
          {notice}
        </p>
      )}
      <section className="admin-card form-section">
        <label>
          Tìm truyện
          <input
            value={search}
            disabled={busy}
            placeholder="Tên truyện…"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          Chọn truyện
          <select
            disabled={busy || loading}
            value={storyId}
            onChange={(event) => setStoryId(event.target.value)}
          >
            <option value="">Chọn truyện</option>
            {stories.map((story) => (
              <option key={story.id} value={story.id}>
                {story.title}
              </option>
            ))}
          </select>
        </label>
        {!stories.length && !loading && (
          <p className="muted">Chưa có truyện được phép nhập.</p>
        )}
        <label className="block mb-3">
          Số chap cho ảnh không có tiền tố
          <input
            type="number"
            min="1"
            max="1000000"
            className="btn w-28 ml-3"
            value={nextNumber}
            disabled={busy || checking || !storyId}
            onChange={(event) => setNextNumber(Number(event.target.value))}
          />
        </label>
        <label className="comic-dropzone">
          <strong>
            {busy ? 'Đang upload/phân tích…' : 'Chọn ảnh nhiều chap'}
          </strong>
          <p className="muted my-3">
            Tên như chap-7_001.jpg, chap-7_002.jpg, chap-8_001.jpg. Ảnh không có
            tiền tố được gom vào chap {nextNumber}. PNG/JPG/WebP, tối đa 10
            MB/ảnh và 100 MB/lần.
          </p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            disabled={busy || checking || !storyId}
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              event.target.value = '';
              void preview(files);
            }}
          />
        </label>
      </section>
      {data && (
        <section className="admin-card mt-5 p-5">
          <h2 className="text-lg font-bold">Bản xem trước trên máy chủ</h2>
          {data.warnings.map((warning) => (
            <p className="admin-alert" key={warning}>
              {warning}
            </p>
          ))}
          {data.chapters.map((row, index) => (
            <article
              className="library-item border-b border-border"
              key={row.number + ':' + index}
            >
              <input
                type="checkbox"
                aria-label={'Chọn chap ' + row.number}
                checked={row.selected}
                disabled={busy}
                onChange={(event) =>
                  setData({
                    ...data,
                    chapters: data.chapters.map((item, position) =>
                      position === index
                        ? { ...item, selected: event.target.checked }
                        : item,
                    ),
                  })
                }
              />
              <div className="min-w-0 flex-1">
                <strong>
                  Chap {row.number} · {row.pages.length} ảnh
                </strong>
                {row.warnings.map((warning) => (
                  <p className="admin-alert danger" key={warning}>
                    {warning}
                  </p>
                ))}
                <details className="mt-3">
                  <summary className="btn">Xem thứ tự ảnh</summary>
                  <div className="comic-preview mt-3">
                    {row.pages.map((page) => (
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
                </details>
              </div>
            </article>
          ))}
          <div className="mt-5 flex flex-wrap gap-3">
            <select
              className="btn"
              aria-label="Trạng thái nhập"
              disabled={busy}
              value={target}
              onChange={(event) =>
                setTarget(event.target.value as 'draft' | 'ready')
              }
            >
              <option value="draft">Bản nháp</option>
              <option value="ready">Sẵn sàng</option>
            </select>
            <button
              className="btn btn-primary"
              disabled={busy || !chosen.length || hasErrors}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  const result = await commitImageImport(
                    storyId,
                    data.id,
                    chosen.map((row) => row.number),
                    target,
                  );
                  setNotice(
                    'Đã tạo ' +
                      result.created +
                      ' chap trên PostgreSQL, chưa xuất bản.',
                  );
                  setData(null);
                  const listing = await listChaptersAdmin(storyId, {
                    pageSize: 1,
                  });
                  setNextNumber(listing.nextNumber);
                } catch (error) {
                  setError((error as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Đang nhập…' : 'Nhập ' + chosen.length + ' chap đã chọn'}
            </button>
            <Link className="btn" href={`/admin/truyen/${storyId}/chuong`}>
              Danh sách chap
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
