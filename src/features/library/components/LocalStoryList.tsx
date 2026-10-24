'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Story } from '@/features/catalog/types/story';
import { StoryCover } from '@/features/catalog/components/StoryCover';
import { Modal } from '@/shared/components/ui/Modal';
import { useLibrary } from '../hooks/useLibrary';
import { readBookmarks, readHistory, writeLibrary } from '../lib/storage';
import { removeRemote } from '../services/client';
import { LIBRARY_EVENT } from '../lib/storage';
export function LocalStoryList({
  kind,
  stories,
}: {
  kind: 'bookmarks' | 'history';
  stories: Story[];
}) {
  const {
    bookmarks,
    history,
    stories: remoteStories,
    remote,
    ready,
    error: syncError,
  } = useLibrary();
  const [remove, setRemove] = useState<string | null>(null),
    [error, setError] = useState('');
  const ids =
    kind === 'bookmarks' ? bookmarks : history.map((item) => item.storyId);
  async function confirm() {
    try {
      if (remote) {
        await removeRemote(
          kind,
          remove === '*' ? undefined : remove || undefined,
        );
        window.dispatchEvent(new Event(LIBRARY_EVENT));
      } else
        writeLibrary(
          kind,
          kind === 'bookmarks'
            ? readBookmarks().filter((id) => remove !== '*' && id !== remove)
            : readHistory().filter(
                (item) => remove !== '*' && item.storyId !== remove,
              ),
        );
      setRemove(null);
      setError('');
    } catch (failure) {
      setError((failure as Error).message);
    }
  }
  if (!ready)
    return (
      <div className="card p-8" role="status">
        Đang tải…
      </div>
    );
  return (
    <>
      {error && (
        <p className="text-danger" role="alert">
          {error}
        </p>
      )}
      {syncError && (
        <p className="admin-alert danger" role="alert">
          {syncError}
        </p>
      )}
      {ids.length > 0 && (
        <div className="mb-4 flex justify-end">
          <button className="btn" onClick={() => setRemove('*')}>
            Xóa tất cả
          </button>
        </div>
      )}
      {!ids.length ? (
        <div className="card p-10 text-center">
          <h2>Chưa có truyện nào</h2>
          <p className="muted mt-2">
            {kind === 'bookmarks'
              ? 'Hãy lưu một truyện bạn yêu thích.'
              : 'Lịch sử sẽ xuất hiện khi bạn bắt đầu đọc.'}
          </p>
          <Link className="btn btn-primary mt-5" href="/">
            Khám phá truyện
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {ids.map((id) => {
            const story = [...remoteStories, ...stories].find(
                (item) => item.id === id,
              ),
              progress = history.find((item) => item.storyId === id);
            return (
              <article className="card library-item" key={id}>
                {story && (
                  <div className="library-cover">
                    <StoryCover
                      title={story.title}
                      cover={story.cover}
                      id={story.id}
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">
                    {story?.title || 'Truyện không còn trong danh mục'}
                  </h2>
                  <p className="muted mt-1 text-sm">{story?.author}</p>
                  {progress && (
                    <p className="muted mt-2 text-sm">
                      Đang đọc chap {progress.chapter} ·{' '}
                      {Math.round(progress.scrollRatio * 100)}%
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {story && (
                      <Link
                        className="btn btn-primary"
                        href={`/truyen/${story.slug}/chap-${progress?.chapter || 1}`}
                      >
                        {progress ? 'Đọc tiếp' : 'Bắt đầu đọc'}
                      </Link>
                    )}
                    <button className="btn" onClick={() => setRemove(id)}>
                      Xóa khỏi {kind === 'bookmarks' ? 'tủ' : 'lịch sử'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <Modal
        open={remove !== null}
        title={remove === '*' ? 'Xóa tất cả mục đã lưu?' : 'Xóa mục này?'}
        onClose={() => setRemove(null)}
      >
        <p className="muted my-4">
          Chỉ xóa dữ liệu {kind === 'bookmarks' ? 'tủ truyện' : 'lịch sử'}{' '}
          {remote ? 'của tài khoản trên các thiết bị' : 'trên trình duyệt này'},
          không xóa truyện.
        </p>
        {error && <p role="alert">{error}</p>}
        <button className="btn btn-primary" onClick={() => void confirm()}>
          Xác nhận xóa
        </button>
      </Modal>
    </>
  );
}
