import type { Metadata } from 'next';
import { ThemePicker } from '@/shared/components/theme/ThemePicker';
import Link from 'next/link';
import { AccountPanel } from '@/features/auth/components/AccountPanel';
export const metadata: Metadata = {
  title: 'Cài đặt',
  robots: { index: false },
};
export default function Settings() {
  return (
    <div className="container section max-w-3xl">
      <h1 className="section-title">Cài đặt</h1>
      <ThemePicker />
      <AccountPanel />
      <div className="card mt-6 p-5">
        <h2 className="text-xl font-bold">Trải nghiệm không quảng cáo</h2>
        <p className="muted mt-2">
          Thử giao diện Premium mẫu trên trình duyệt này. Chưa có gói mua hoặc
          thanh toán thật.
        </p>
        <Link href="/premium" className="btn mt-4">
          Xem thử Premium →
        </Link>
      </div>
      <div className="card mt-6 p-5">
        <h2 className="text-xl font-bold">Cài đặt trang đọc truyện tranh</h2>
        <p className="muted mt-2">
          Nền đọc và độ rộng trang truyện có thể thay đổi trực tiếp bằng nút
          bánh răng ở mỗi chapter.
        </p>
      </div>
    </div>
  );
}
