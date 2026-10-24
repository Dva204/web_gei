'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  getSession,
  signOut,
  updateProfile,
  changePassword,
  listSessions,
  revokeSession,
  type AccountSession,
} from '../services/client';
import { importLocalLibrary } from '@/features/library/services/client';
import {
  LIBRARY_EVENT,
  readBookmarks,
  readHistory,
  writeLibrary,
} from '@/features/library/lib/storage';
import type { SessionUser } from '@/shared/lib/auth/types';

export function AccountPanel() {
  const [user, setUser] = useState<SessionUser | null>(null),
    [sessions, setSessions] = useState<AccountSession[]>([]),
    [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const result = await getSession();
        const activeSessions = result.user ? await listSessions() : [];
        if (live) {
          setUser(result.user);
          setName(result.user?.name || '');
          setSessions(activeSessions);
          setError('');
        }
      } catch {
        if (live) setError('Không tải được tài khoản. Vui lòng tải lại trang.');
      } finally {
        if (live) setReady(true);
      }
    };
    void load();
    const auth = () => void load();
    window.addEventListener('vuon-auth-change', auth);
    return () => {
      live = false;
      window.removeEventListener('vuon-auth-change', auth);
    };
  }, []);
  const run = async (key: string, operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    setError('');
    setNotice('');
    try {
      await operation();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Không thể cập nhật.',
      );
    } finally {
      setBusy('');
    }
  };
  const logout = (all: boolean) =>
    run('logout', async () => {
      await signOut(all);
      setUser(null);
      setSessions([]);
    });
  if (!ready)
    return (
      <section className="card mt-6 p-5" role="status">
        Đang tải tài khoản…
      </section>
    );
  return (
    <section className="card mt-6 p-5">
      <h2 className="text-xl font-bold">Tài khoản</h2>
      {!user ? (
        !error && (
          <div className="mt-4 flex gap-3">
            <Link className="btn btn-primary" href="/dang-nhap">
              Đăng nhập
            </Link>
            <Link className="btn" href="/dang-ky">
              Đăng ký
            </Link>
          </div>
        )
      ) : (
        <>
          <p className="muted mt-2">
            {user.email} · Vai trò {user.role}
          </p>
          <form
            className="mt-5 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void run('profile', async () => {
                const saved = await updateProfile(name);
                setUser(saved);
                setNotice('Đã cập nhật tên hiển thị.');
              });
            }}
          >
            <h3 className="font-semibold">Hồ sơ</h3>
            <label>
              Tên hiển thị
              <input
                className="mt-2 w-full rounded-[var(--radius-md)] border border-border bg-bg p-3"
                minLength={2}
                maxLength={80}
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <button className="btn w-fit" disabled={Boolean(busy)}>
              {busy === 'profile' ? 'Đang lưu…' : 'Lưu hồ sơ'}
            </button>
          </form>
          <form
            className="mt-7 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget),
                next = String(form.get('newPassword') || '');
              if (next !== form.get('confirmPassword')) {
                setError('Hai mật khẩu mới không khớp.');
                return;
              }
              void run('password', async () => {
                await changePassword(
                  String(form.get('currentPassword') || ''),
                  next,
                  form.get('revoke') === 'on',
                );
                event.currentTarget.reset();
                setNotice('Đã đổi mật khẩu.');
                setSessions(await listSessions());
              });
            }}
          >
            <h3 className="font-semibold">Đổi mật khẩu</h3>
            <label>
              Mật khẩu hiện tại
              <input
                className="mt-2 w-full rounded-[var(--radius-md)] border border-border bg-bg p-3"
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                minLength={12}
                maxLength={128}
                required
              />
            </label>
            <label>
              Mật khẩu mới
              <input
                className="mt-2 w-full rounded-[var(--radius-md)] border border-border bg-bg p-3"
                type="password"
                name="newPassword"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
              />
            </label>
            <label>
              Nhập lại mật khẩu mới
              <input
                className="mt-2 w-full rounded-[var(--radius-md)] border border-border bg-bg p-3"
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
              />
            </label>
            <label className="flex gap-2">
              <input type="checkbox" name="revoke" defaultChecked /> Đăng xuất
              các thiết bị khác sau khi đổi
            </label>
            <button className="btn w-fit" disabled={Boolean(busy)}>
              {busy === 'password' ? 'Đang đổi…' : 'Đổi mật khẩu'}
            </button>
          </form>
          <section className="mt-7">
            <h3 className="font-semibold">Phiên đăng nhập</h3>
            <p className="muted mt-1 text-sm">
              Vì chưa lưu thông tin thiết bị, danh sách hiện hiển thị thời điểm
              tạo và hết hạn.
            </p>
            <div className="mt-3 grid gap-2">
              {sessions.map((session) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border p-3"
                  key={session.id}
                >
                  <span>
                    <strong>
                      {session.current ? 'Thiết bị hiện tại' : 'Thiết bị khác'}
                    </strong>
                    <small className="muted block">
                      Tạo {new Date(session.createdAt).toLocaleString('vi-VN')}{' '}
                      · hết hạn{' '}
                      {new Date(session.expiresAt).toLocaleString('vi-VN')}
                    </small>
                  </span>
                  <button
                    className="btn"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      void run('session', async () => {
                        const result = await revokeSession(session.id);
                        if (result.current) {
                          setUser(null);
                          setSessions([]);
                        } else setSessions(await listSessions());
                      })
                    }
                  >
                    Thu hồi
                  </button>
                </div>
              ))}
            </div>
          </section>
          <section className="mt-7">
            <h3 className="font-semibold">Dữ liệu đọc trên trình duyệt này</h3>
            <p className="muted mt-1 text-sm">
              Chỉ nhập khi bạn bấm xác nhận. Dữ liệu được gộp, không xóa tiến độ
              mới hơn trên tài khoản.
            </p>
            <button
              className="btn mt-3"
              disabled={Boolean(busy)}
              onClick={() =>
                void run('import', async () => {
                  const bookmarks = readBookmarks(),
                    history = readHistory();
                  if (!bookmarks.length && !history.length) {
                    setNotice(
                      'Trình duyệt này không có dữ liệu khách để nhập.',
                    );
                    return;
                  }
                  if (
                    !window.confirm(
                      `Nhập ${bookmarks.length} truyện đã lưu và ${history.length} lịch sử vào tài khoản?`,
                    )
                  )
                    return;
                  const result = await importLocalLibrary(bookmarks, history);
                  if (!result)
                    throw new Error('Phiên đăng nhập không còn hợp lệ.');
                  writeLibrary('bookmarks', []);
                  writeLibrary('history', []);
                  window.dispatchEvent(new Event(LIBRARY_EVENT));
                  setNotice(
                    `Đã nhập ${result.bookmarks} mục tủ truyện và ${result.history} tiến độ; bỏ qua ${result.skipped} truyện không còn công khai.`,
                  );
                })
              }
            >
              {busy === 'import'
                ? 'Đang nhập…'
                : 'Nhập tủ truyện và lịch sử khách'}
            </button>
          </section>
          <div className="mt-7 flex flex-wrap gap-3">
            {user.role !== 'member' && (
              <Link className="btn" href="/admin">
                Trang quản trị
              </Link>
            )}
            <button
              className="btn"
              disabled={Boolean(busy)}
              onClick={() => void logout(false)}
            >
              Đăng xuất
            </button>
            <button
              className="btn"
              disabled={Boolean(busy)}
              onClick={() => {
                if (window.confirm('Đăng xuất khỏi tất cả thiết bị?'))
                  void logout(true);
              }}
            >
              Đăng xuất tất cả thiết bị
            </button>
          </div>
        </>
      )}
      {notice && (
        <p className="admin-alert success mt-4" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="admin-alert danger mt-4" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
