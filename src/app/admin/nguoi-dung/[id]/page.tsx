import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaffPage } from '@/server/auth/authorization';
import { getAdminUserDetail } from '@/server/users/repository';
import { ApiError } from '@/server/http/errors';
import { PageHeader, StatusBadge } from '@/features/admin/components/common/AdminUI';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage('users.sanction');
  const actor = await requireStaffPage('users.sanction');
  const { id } = await params;
  let user: Awaited<ReturnType<typeof getAdminUserDetail>>;
  try {
    user = await getAdminUserDetail(actor, id);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'NOT_FOUND') notFound();
    throw error;
  }
  return (
    <>
      <PageHeader title={user.name} description="Hồ sơ, quyền và hoạt động tài khoản trong PostgreSQL." />
      <section className="admin-card form-section">
        <div className="form-two">
          <div><small>Email</small><p>{user.email}</p></div>
          <div><small>Vai trò</small><p>{user.role}</p></div>
          <div><small>Trạng thái</small><p><StatusBadge value={user.status} /></p></div>
          <div><small>Ngày tạo</small><p>{new Date(user.createdAt).toLocaleString('vi-VN')}</p></div>
          <div><small>Phiên đang hoạt động</small><p>{user.counts.sessions}</p></div>
          <div><small>Tủ truyện / lịch sử</small><p>{user.counts.bookmarks} / {user.counts.history}</p></div>
          <div><small>Bình luận</small><p>{user.counts.comments}</p></div>
          <div><small>Phân công nội dung</small><p>{user.counts.assignments}</p></div>
        </div>
      </section>
      <section className="admin-card form-section mt-4">
        <h2>Truyện được phân công</h2>
        {!user.assignments.length ? <p className="muted mt-3">Chưa có phân công.</p> : user.assignments.map((item) => (
          <div className="compact-row" key={`${item.story.id}-${item.kind}`}>
            <span><strong>{item.story.title}</strong><small>{item.kind} · {new Date(item.createdAt).toLocaleDateString('vi-VN')}</small></span>
            <Link className="btn" href={`/admin/truyen/${item.story.id}`}>Mở truyện</Link>
          </div>
        ))}
      </section>
      <section className="admin-card form-section mt-4">
        <h2>Lịch sử xử lý tài khoản</h2>
        {!user.accountEvents.length ? <p className="muted mt-3">Chưa có lần xử lý nào.</p> : user.accountEvents.map((item) => (
          <div className="compact-row" key={item.id}><span><strong>{item.summary}</strong><small>{item.action} · {new Date(item.createdAt).toLocaleString('vi-VN')}</small></span></div>
        ))}
      </section>
      <section className="admin-card form-section mt-4">
        <h2>Hoạt động quản trị do tài khoản thực hiện</h2>
        {!user.audit.length ? <p className="muted mt-3">Chưa có hoạt động quản trị.</p> : user.audit.map((item) => (
          <div className="compact-row" key={item.id}><span><strong>{item.summary}</strong><small>{item.action} · {new Date(item.createdAt).toLocaleString('vi-VN')}</small></span></div>
        ))}
      </section>
      <Link className="btn mt-4" href="/admin/nguoi-dung">Quay lại danh sách</Link>
    </>
  );
}
