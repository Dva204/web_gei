'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Bot,
  ChevronLeft,
  FileText,
  Flag,
  Gauge,
  LogOut,
  Menu,
  MessageCircle,
  Megaphone,
  Search,
  Settings,
  Shield,
  Tags,
  Users,
  X,
} from 'lucide-react';
import { ModeToggle } from '@/shared/components/theme/ModeToggle';
import { ADMIN_COPY } from '@/features/admin/lib/copy';
import {
  getAdminSession,
  logoutAdmin,
  setAdminSession,
  refreshAdminSession,
} from '@/features/admin/services/auth';
import { can } from '@/features/admin/lib/permissions';
import type { AdminUser } from '@/features/admin/types';
import type { SessionUser } from '@/shared/lib/auth/types';

const nav = [
  ['/', ADMIN_COPY.nav.overview, Gauge, 'dashboard.view'],
  ['/truyen', ADMIN_COPY.nav.stories, BookOpen, 'stories.manage'],
  ['/nhap-hang-loat', ADMIN_COPY.nav.import, FileText, 'import.manage'],
  ['/the-loai', ADMIN_COPY.nav.taxonomy, Tags, 'taxonomy.manage'],
  ['/tac-gia', ADMIN_COPY.nav.authors, Users, 'taxonomy.manage'],
  ['/binh-luan', ADMIN_COPY.nav.comments, MessageCircle, 'comments.moderate'],
  ['/bao-loi', ADMIN_COPY.nav.reports, Flag, 'reports.view'],
  ['/yeu-cau-go', ADMIN_COPY.nav.takedowns, Shield, 'takedowns.view'],
  ['/chat', ADMIN_COPY.nav.chat, Bot, 'chat.manage'],
  ['/nguoi-dung', ADMIN_COPY.nav.users, Users, 'users.sanction'],
  ['/quang-cao', ADMIN_COPY.nav.ads, Megaphone, 'ads.manage'],
  ['/affiliate', ADMIN_COPY.nav.affiliate, BarChart3, 'ads.manage'],
  ['/thong-ke', ADMIN_COPY.nav.stats, BarChart3, 'stats.content'],
  ['/seo', ADMIN_COPY.nav.seo, Search, 'seo.manage'],
  ['/noi-dung-trang', ADMIN_COPY.nav.content, FileText, 'content.manage'],
  ['/cai-dat', ADMIN_COPY.nav.settings, Settings, 'settings.manage'],
  ['/nhat-ky', ADMIN_COPY.nav.audit, Shield, 'audit.own'],
  ['/sao-luu', ADMIN_COPY.nav.backup, FileText, 'backup.manage'],
] as const;
export function AdminShell({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: SessionUser | null;
}) {
  const path = usePathname(),
    isLogin = path === '/admin/dang-nhap',
    isForbidden = path === '/admin/403';
  const [user, setUser] = useState<AdminUser | null>(null),
    [ready, setReady] = useState(false),
    [open, setOpen] = useState(false);
  useEffect(() => {
    const sync = () => {
      setUser(getAdminSession());
      setReady(true);
    };
    setAdminSession(initialUser);
    sync();
    window.addEventListener('admin-session', sync);
    const refresh = () => {
      void refreshAdminSession().catch(() => {
        setUser(null);
      });
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('vuon-auth-change', refresh);
    return () => {
      window.removeEventListener('admin-session', sync);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('vuon-auth-change', refresh);
    };
  }, [initialUser]);
  const links = useMemo(
    () =>
      user
        ? nav.filter(
            ([, , , permission]) =>
              permission === 'dashboard.view' ||
              can(
                user,
                permission,
                ['stories.manage', 'import.manage'].includes(permission)
                  ? {
                      type: 'navigation',
                      assigneeIds: [user.id],
                    }
                  : undefined,
              ),
          )
        : [],
    [user],
  );
  if (isLogin || isForbidden) return <>{children}</>;
  if (ready && !user)
    return (
      <div className="admin-boot">
        Phiên đăng nhập không còn hợp lệ.{' '}
        <a className="btn" href="/admin/dang-nhap">
          Đăng nhập lại
        </a>
      </div>
    );
  if (!ready || !user)
    return <div className="admin-boot">{ADMIN_COPY.loading}</div>;
  return (
    <div className="admin-shell" data-density="compact">
      <button
        className="admin-menu-btn btn"
        aria-label={ADMIN_COPY.openMenu}
        onClick={() => setOpen(true)}
      >
        <Menu size={20} />
      </button>
      {open && (
        <button
          className="admin-backdrop"
          aria-label={ADMIN_COPY.closeMenu}
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`admin-sidebar ${open ? 'is-open' : ''}`}>
        <div className="admin-brand">
          <span>V</span>
          <div>
            <strong>{ADMIN_COPY.brand}</strong>
            <small>Không gian vận hành</small>
          </div>
          <button
            className="admin-close"
            onClick={() => setOpen(false)}
            aria-label={ADMIN_COPY.closeMenu}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Điều hướng quản trị">
          {links.map(([href, label, Icon]) => {
            const full = '/admin' + href,
              active = href === '/' ? path === full : path.startsWith(full);
            return (
              <Link
                key={href}
                href={full}
                className={active ? 'active' : ''}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <Link className="admin-site-link" href="/">
          <ChevronLeft size={17} /> Về trang đọc
        </Link>
      </aside>
      <div className="admin-stage">
        <header className="admin-topbar">
          <div className="admin-topbar-spacer" />
          <span className="admin-role">
            {user.name} · {ADMIN_COPY.roles[user.role]}
          </span>
          <ModeToggle />
          <button
            className="btn icon-btn"
            title={ADMIN_COPY.logout}
            aria-label={ADMIN_COPY.logout}
            onClick={async () => {
              try {
                await logoutAdmin();
                window.location.replace('/admin/dang-nhap');
              } catch {
                window.alert(
                  'Chưa đăng xuất được trên máy chủ. Vui lòng thử lại.',
                );
              }
            }}
          >
            <LogOut size={18} />
          </button>
        </header>
        <main className="admin-main">
          <p className="admin-alert">
            Auth, danh mục, chap, ảnh và tủ truyện/lịch sử đã nối backend. Kiểm
            duyệt, chat và quảng cáo vẫn đang chuyển đổi; dữ liệu mẫu ở các mục
            đó chưa lưu trên máy chủ.
          </p>
          {children}
        </main>
      </div>
    </div>
  );
}
