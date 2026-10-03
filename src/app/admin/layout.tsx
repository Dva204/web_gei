import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/shell/AdminShell';
import '@/styles/admin.css';
import '@/styles/admin-advertising.css';
export const metadata: Metadata = {
  title: { default: 'Quản trị', template: '%s | Vườn quản trị' },
  robots: { index: false, follow: false },
};
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
