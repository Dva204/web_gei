import type { Metadata } from 'next';
import { LocalStoryList } from '@/components/shared/LocalStoryList';
export const metadata: Metadata = {
  title: 'Tủ truyện',
  robots: { index: false },
};
export default function Library() {
  return (
    <div className="container section max-w-3xl">
      <h1 className="section-title">Tủ truyện</h1>
      <LocalStoryList kind="bookmarks" />
    </div>
  );
}
