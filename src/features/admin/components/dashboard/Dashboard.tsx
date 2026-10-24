'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarClock, Eye, FileWarning, MessageCircle, TrendingUp, Users } from 'lucide-react';
import { getDashboardOverview } from '@/features/admin/services/operations';
import type { DashboardOverview } from '@/features/admin/types';
import { PageHeader, ProgressBar, StatCard } from '@/features/admin/components/common/AdminUI';
import { ADMIN_COPY } from '@/features/admin/lib/copy';

export function Dashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    void getDashboardOverview().then(setOverview).catch((failure) => setError((failure as Error).message));
  }, []);
  const maxPoint = useMemo(() => Math.max(1, ...(overview?.stats.series.map((point) => point.value) || [1])), [overview]);
  const percent = (value: number) => overview?.stories.total ? Math.round(value / overview.stories.total * 100) : 0;
  return <>
    <PageHeader title={ADMIN_COPY.dashboard.title} description={ADMIN_COPY.dashboard.description} actions={<Link className="btn btn-primary" href="/admin/truyen/moi">+ Thêm truyện</Link>} />
    {error && <p className="admin-alert danger" role="alert">{error}</p>}
    <section className="admin-stats">
      <StatCard label="Lượt xem 7 ngày" value={overview?.stats.views.toLocaleString('vi-VN') ?? '—'} detail={overview ? `${overview.stats.previousDelta >= 0 ? '+' : ''}${overview.stats.previousDelta}% so với kỳ trước` : 'Đang tải dữ liệu'} icon={Eye} />
      <StatCard label="Người đọc" value={overview?.stats.readers.toLocaleString('vi-VN') ?? '—'} detail="Browser riêng trong kỳ" icon={Users} tone="success" />
      <StatCard label="Chờ duyệt" value={overview ? String(overview.queues.comments) : '—'} detail="Bình luận mới" icon={MessageCircle} tone="warning" />
      <StatCard label="Yêu cầu gỡ" value={overview ? String(overview.queues.takedowns) : '—'} detail="Cần phản hồi đúng hạn" icon={FileWarning} tone="danger" />
    </section>
    <div className="admin-dashboard-grid">
      <section className="admin-card admin-chart">
        <div className="admin-card-title"><div><h2>Nhịp đọc 7 ngày</h2><p>Lượt xem theo ngày</p></div><TrendingUp /></div>
        <div className="mini-chart">{overview?.stats.series.map((point) => <div key={point.label}><span style={{ height: `${Math.max(4, Math.round(point.value / maxPoint * 100))}%` }} /><small>{point.label}</small></div>)}</div>
      </section>
      <section className="admin-card">
        <div className="admin-card-title"><div><h2>Việc cần xử lý</h2><p>Dữ liệu trực tiếp từ PostgreSQL</p></div><CalendarClock /></div>
        <div className="queue-list">
          <Link href="/admin/binh-luan"><i className="dot warning" /><span><strong>{overview?.queues.comments ?? 0} bình luận chờ duyệt</strong><small>Mở hàng đợi kiểm duyệt</small></span><b>Đi tới</b></Link>
          <Link href="/admin/yeu-cau-go"><i className="dot danger" /><span><strong>{overview?.queues.takedowns ?? 0} yêu cầu gỡ mới</strong><small>Kiểm tra hạn phản hồi</small></span><b>Đi tới</b></Link>
          <Link href="/admin/truyen"><i className="dot accent" /><span><strong>{overview?.stories.missingRights ?? 0} truyện thiếu quyền hợp lệ</strong><small>Không thể công khai an toàn</small></span><b>Đi tới</b></Link>
        </div>
      </section>
      <section className="admin-card">
        <div className="admin-card-title"><div><h2>Quyền sắp hết hạn</h2><p>Trong vòng 30 ngày</p></div><FileWarning /></div>
        {!overview?.expiringRights.length ? <p className="muted">Không có quyền sắp hết hạn.</p> : overview.expiringRights.map((story) => <div className="compact-row" key={story.id}><span><strong>{story.title}</strong><small>{new Date(story.rightsExpiresAt).toLocaleDateString('vi-VN')}</small></span><span className="admin-badge status-scheduled">Cần gia hạn</span></div>)}
      </section>
      <section className="admin-card">
        <div className="admin-card-title"><div><h2>Tiến độ nội dung</h2><p>{overview?.stories.total ?? 0} truyện đang quản lý</p></div><BookOpen /></div>
        {[
          ['Đã công khai', overview?.stories.public ?? 0],
          ['Đang biên tập', overview?.stories.editing ?? 0],
          ['Thiếu khai báo quyền', overview?.stories.missingRights ?? 0],
        ].map(([label, value]) => <div className="metric-row" key={String(label)}><div><span>{label}</span><b>{value} · {percent(Number(value))}%</b></div><ProgressBar value={percent(Number(value))} /></div>)}
      </section>
    </div>
  </>;
}
