import type { Metadata } from 'next';
import { LocalStoryList } from '@/components/shared/LocalStoryList';
export const metadata: Metadata = {
  title: 'Lịch sử đọc',
  robots: { index: false },
};
export default function History() {
  return (
    <div className="container section max-w-3xl">
      <h1 className="section-title">Lịch sử đọc</h1>
      <LocalStoryList kind="history" />
    </div>
  );
}
