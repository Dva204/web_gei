'use client';
import Image from 'next/image';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import type { ComicPage } from '@/features/catalog/types/chapter';
import { movePage } from '../../lib/comicImages';
import { uploadComicImages } from '../../services/chapters';
export function ComicPagesEditor({
  storyId,
  disabled = false,
  pages,
  onChange,
  onBusyChange,
}: {
  storyId: string;
  disabled?: boolean;
  pages: ComicPage[];
  onChange: (pages: ComicPage[]) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [dragged, setDragged] = useState<number | null>(null);
  async function add(files: File[]) {
    if (busy || disabled) return;
    setBusy(true);
    onBusyChange(true);
    setError('');
    try {
      if (pages.length + files.length > 300)
        throw new Error('Tối đa 300 ảnh mỗi chap.');
      const images = await uploadComicImages(storyId, files);
      onChange([...pages, ...images]);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <section aria-label="Quản lý ảnh chap">
      <label
        className="comic-dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!busy && !disabled)
            void add(Array.from(event.dataTransfer.files));
        }}
      >
        <strong>
          {busy ? 'Đang kiểm tra ảnh…' : 'Chọn nhiều ảnh hoặc kéo thả vào đây'}
        </strong>
        <p className="muted my-2 text-sm">
          Upload lên máy chủ: PNG, JPG, WebP · tối đa 10 MB/ảnh, 100 MB/lần. Tự
          xếp 1, 2, 10 theo tên file.
        </p>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          disabled={busy || disabled}
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            event.target.value = '';
            void add(files);
          }}
        />
      </label>
      {error && (
        <p className="admin-alert danger mt-3" role="alert">
          {error}
        </p>
      )}
      <p className="muted my-4 text-sm">
        {pages.length} ảnh · Kéo thả để đổi thứ tự. Trên mobile dùng nút mũi
        tên.
      </p>
      <div className="comic-page-grid">
        {pages.map((page, index) => (
          <article
            className="comic-page-card"
            key={page.id}
            draggable={!busy && !disabled}
            onDragStart={() => setDragged(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!busy && !disabled && dragged !== null)
                onChange(movePage(pages, dragged, index));
              setDragged(null);
            }}
          >
            <Image
              src={page.image}
              alt={page.alt}
              width={page.width}
              height={page.height}
              unoptimized
            />
            <p className="my-2 truncate text-sm">
              {index + 1}. {page.alt}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                className="btn"
                disabled={busy || disabled || index === 0}
                aria-label={`Đưa ảnh ${index + 1} lên trước`}
                onClick={() => onChange(movePage(pages, index, index - 1))}
              >
                <ArrowLeft size={16} />
              </button>
              <button
                type="button"
                className="btn"
                disabled={busy || disabled || index === pages.length - 1}
                aria-label={`Đưa ảnh ${index + 1} ra sau`}
                onClick={() => onChange(movePage(pages, index, index + 1))}
              >
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className="btn"
                disabled={busy || disabled}
                aria-label={`Bỏ ảnh ${index + 1} khỏi bản nháp`}
                onClick={() =>
                  onChange(pages.filter((item) => item.id !== page.id))
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
