'use client';
import Link from 'next/link';
import { BadgeCheck, EyeOff, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useAdvertising } from '@/lib/advertising/useAdvertising';
import { updateAdvertising } from '@/lib/advertising/store';

export function PremiumDemo() {
  const config = useAdvertising();
  const [notice, setNotice] = useState('');
  if (!config) return <p className="muted">Đang tải tùy chọn trải nghiệm…</p>;
  function toggle(value: boolean) {
    try {
      updateAdvertising((current) => ({ ...current, premiumDemo: value }));
      setNotice(
        value
          ? 'Đã bật trải nghiệm Premium mẫu trên trình duyệt này.'
          : 'Đã trở lại chế độ đọc thường.',
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không thể lưu.');
    }
  }
  return (
    <div className="premium-demo card">
      <span className="chip">Chỉ là bản thử nghiệm · không thu phí</span>
      <BadgeCheck size={36} className="text-accent" />
      <h2>Đọc liền mạch, ít xao nhãng hơn</h2>
      <p className="muted">
        Thử giao diện không quảng cáo trước khi hệ thống có gói Premium thật.
        Không cần nhập thông tin thanh toán, không tạo đăng ký.
      </p>
      <div className="premium-demo-features">
        <p>
          <EyeOff size={20} />
          Ẩn banner mạng quảng cáo và booking.
        </p>
        <p>
          <ShieldCheck size={20} />
          {config.premiumHidesAffiliate
            ? 'Ẩn cả gợi ý sản phẩm affiliate.'
            : 'Gợi ý affiliate vẫn được hiển thị theo cài đặt demo.'}
        </p>
      </div>
      <strong className="text-accent">
        {config.premiumDemo
          ? 'Premium demo đang bật'
          : 'Bạn đang ở chế độ đọc thường'}
      </strong>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => toggle(!config.premiumDemo)}
      >
        {config.premiumDemo
          ? 'Tắt trải nghiệm thử'
          : 'Thử chế độ không quảng cáo'}
      </button>
      <Link href="/" className="btn">
        Quay lại đọc truyện
      </Link>
      {notice && (
        <p role="status" className="ad-help">
          {notice}
        </p>
      )}
      <small className="muted">
        Tùy chọn chỉ lưu trên thiết bị và địa chỉ website này; chưa có tài khoản
        Premium hoặc đồng bộ đa thiết bị.
      </small>
    </div>
  );
}
