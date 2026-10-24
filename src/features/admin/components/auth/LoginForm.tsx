'use client';
import { useState } from 'react';
import { KeyRound, Leaf } from 'lucide-react';
import { loginAdmin } from '@/features/admin/services/auth';
import { ADMIN_COPY } from '@/features/admin/lib/copy';
export function LoginForm() {
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  return <div className="admin-login"><section className="admin-login-art"><span className="login-logo"><Leaf /></span><div><p>Không gian vận hành</p><h1>Nội dung tử tế bắt đầu từ một quy trình rõ ràng.</h1><span>Quản lý truyện tranh, chap và cộng đồng trong một nơi dễ tập trung.</span></div></section>
    <section className="admin-login-panel"><form className="admin-login-card" aria-busy={busy} onSubmit={async event => {
      event.preventDefault(); if (busy) return; setBusy(true); setError('');
      try { await loginAdmin(email, password); window.location.replace('/admin'); }
      catch (error) { setError(error instanceof Error ? error.message : 'Không thể đăng nhập.'); }
      finally { setBusy(false); }
    }}><span className="login-icon"><KeyRound /></span><h2>{ADMIN_COPY.loginTitle}</h2><p>Đăng nhập bằng tài khoản được cấp quyền trên máy chủ.</p>
      <label>Email<input type="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} required /></label>
      <label>Mật khẩu<input type="password" autoComplete="current-password" minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} required /></label>
      {error && <div className="admin-alert danger" role="alert">{error}</div>}
      <button className="btn btn-primary" disabled={busy}>{busy ? ADMIN_COPY.loading : 'Đăng nhập'}</button>
      <small>Không có mật khẩu/OTP mẫu. Admin đầu tiên được tạo bằng CLI bootstrap; 2FA chưa được triển khai.</small>
    </form></section></div>;
}
