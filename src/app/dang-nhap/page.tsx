import type { Metadata } from 'next';
import { AuthForm } from '@/features/auth/components/AuthForm';
export const metadata: Metadata = {
  title: 'Đăng nhập',
  robots: { index: false },
};
export default function Login() {
  return (
    <div className="container section">
      <h1 className="section-title text-center">Chào bạn trở lại</h1>
      <AuthForm />
    </div>
  );
}
