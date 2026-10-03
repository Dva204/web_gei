import type { Metadata } from 'next';
import { AuthForm } from '@/features/auth/components/AuthForm';
export const metadata: Metadata = {
  title: 'Đăng ký',
  robots: { index: false },
};
export default function Register() {
  return (
    <div className="container section">
      <h1 className="section-title text-center">Tạo tài khoản</h1>
      <AuthForm register />
    </div>
  );
}
