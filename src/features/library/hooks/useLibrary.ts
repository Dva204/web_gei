'use client';
import { useEffect, useState } from 'react';
import {
  LIBRARY_EVENT,
  readBookmarks,
  readHistory,
  type HistoryItem,
} from '../lib/storage';
import { loadRemoteLibrary, resetRemoteKnowledge } from '../services/client';
import type { Story } from '@/features/catalog/types/story';

export function useLibrary() {
  const [state, setState] = useState<{
    bookmarks: string[];
    history: HistoryItem[];
    stories: Story[];
    remote: boolean;
    error: string;
    ready: boolean;
  }>({
    bookmarks: [],
    history: [],
    stories: [],
    remote: false,
    error: '',
    ready: false,
  });
  useEffect(() => {
    let active = true;
    const sync = async () => {
      const local = {
        bookmarks: readBookmarks(),
        history: readHistory(),
        stories: [],
        remote: false,
        error: '',
        ready: true,
      };
      if (active) setState(local);
      try {
        const data = await loadRemoteLibrary();
        if (active && data)
          setState({
            bookmarks: data.bookmarks.map((row) => row.storyId),
            history: data.history.map(({ story: _story, ...row }) => row),
            stories: [
              ...new Map(
                [
                  ...data.bookmarks.map((row) => row.story),
                  ...data.history.map((row) => row.story),
                ].map((story) => [story.id, story]),
              ).values(),
            ],
            remote: true,
            error: '',
            ready: true,
          });
      } catch {
        if (active)
          setState((current) => ({
            ...current,
            error: 'Không đồng bộ được dữ liệu tài khoản. Hãy thử lại.',
          }));
      }
    };
    void sync();
    const localSync = () => void sync();
    const authSync = () => {
      resetRemoteKnowledge();
      void sync();
    };
    window.addEventListener('storage', localSync);
    window.addEventListener(LIBRARY_EVENT, localSync);
    window.addEventListener('vuon-auth-change', authSync);
    return () => {
      active = false;
      window.removeEventListener('storage', localSync);
      window.removeEventListener(LIBRARY_EVENT, localSync);
      window.removeEventListener('vuon-auth-change', authSync);
    };
  }, []);
  return state;
}
