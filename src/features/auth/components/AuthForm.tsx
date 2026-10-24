'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authRequest } from '../services/client';
export function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  return <form className="card mx-auto max-w-md p-6" aria-busy={busy} onSubmit={async event => {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget), password = String(form.get('password') || '');
    if (register && password !== form.get('confirmPassword')) { setMessage('Hai mật khẩu không khớp.'); return; }
    setBusy(true); setMessage('');
    try {
      await authRequest('/api/auth/' + (register ? 'register' : 'login'), {
        email: form.get('email'), password, ...(register ? { name: form.get('name') } : {}),
      });
      router.replace('/cai-dat'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể đăng nhập.'); }
    finally { setBusy(false); }
  }}>
    {register && <label className="block">Tên hiển thị<input name="name" autoComplete="nickname" required minLength={2} maxLength={80} className="mt-2 w-full rounded-[var(--radius-md)] border border-border bg-bg p-3" /></label>}
    <label className="mt-4 block">Email<input name="email" required type="email" autoComplete="email" maxLength={254} className="mt-2 w-full rounded-[var(--radius-md)] border border-border bg-bg p-3" /></label>
    <label className="mt-4 block">Mật khẩu<input name="password" required minLength={12} maxLength={128} type="password" autoComplete={register ? 'new-password' : 'current-password'} className="mt-2 w-full rounded-[var(--radius-md)] border border-border bg-bg p-3" /></label>
    {register && <label className="mt-4 block">Nhập lại mật khẩu<input name="confirmPassword" required minLength={12} maxLength={128} type="password" autoComplete="new-password" className="mt-2 w-full rounded-[var(--radius-md)] border border-border bg-bg p-3" /></label>}
    <p className="muted mt-3 text-sm">Mật khẩu từ 12 đến 128 ký tự. Chưa hỗ trợ Google hoặc khôi phục qua email.</p>
    <button className="btn btn-primary mt-5 w-full" disabled={busy}>{busy ? 'Đang xử lý…' : register ? 'Tạo tài khoản' : 'Đăng nhập'}</button>
    <Link className="btn mt-3 w-full" href={register ? '/dang-nhap' : '/dang-ky'}>{register ? 'Đã có tài khoản? Đăng nhập' : 'Tạo tài khoản mới'}</Link>
    {message && <p className="mt-4 text-sm text-accent" role="alert">{message}</p>}
  </form>;
}
