import type { Metadata } from 'next';
import { LocalStoryList } from '@/features/library/components/LocalStoryList';
import { listStories } from '@/features/catalog/services';
export const metadata: Metadata = {
  title: 'Lịch sử đọc',
  robots: { index: false },
};
export default async function History() {
  const { items } = await listStories({ pageSize: 100 });
  return (
    <div className="container section max-w-3xl">
      <h1 className="section-title">Lịch sử đọc</h1>
      <LocalStoryList kind="history" stories={items} />
    </div>
  );
}
