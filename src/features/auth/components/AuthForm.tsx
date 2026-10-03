'use client';
import { useState } from 'react';
export function AuthForm({ register = false }: { register?: boolean }) {
  const [message, setMessage] = useState('');
  return (
    <form
      className="card mx-auto max-w-md p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(
          'Đây là giao diện minh họa. Tính năng tài khoản sẽ được kết nối sau.',
        );
      }}
    >
      <label className="block">
        Email
        <input
          required
          type="email"
          className="mt-2 w-full rounded-[var(--radius-md)] border border-border bg-bg p-3"
        />
      </label>
      <label className="mt-4 block">
        Mật khẩu
        <input
          required
          minLength={8}
          type="password"
          className="mt-2 w-full rounded-[var(--radius-md)] border border-border bg-bg p-3"
        />
      </label>
      {register && (
        <label className="mt-4 block">
          Nhập lại mật khẩu
          <input
            required
            minLength={8}
            type="password"
            className="mt-2 w-full rounded-[var(--radius-md)] border border-border bg-bg p-3"
          />
        </label>
      )}
      <button className="btn btn-primary mt-5 w-full">
        {register ? 'Tạo tài khoản' : 'Đăng nhập'}
      </button>
      <button type="button" className="btn mt-3 w-full">
        Tiếp tục với Google
      </button>
      {message && (
        <p className="mt-4 text-sm text-accent" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
