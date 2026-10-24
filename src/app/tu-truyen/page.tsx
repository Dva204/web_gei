import type { Metadata } from 'next';
import { LocalStoryList } from '@/features/library/components/LocalStoryList';
import { listStories } from '@/features/catalog/services';
export const metadata: Metadata = {
  title: 'Tủ truyện',
  robots: { index: false },
};
export default async function Library() {
  const { items } = await listStories({ pageSize: 100 });
  return (
    <div className="container section max-w-3xl">
      <h1 className="section-title">Tủ truyện</h1>
      <LocalStoryList kind="bookmarks" stories={items} />
    </div>
  );
}
