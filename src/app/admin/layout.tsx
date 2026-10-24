import type { Metadata } from 'next';
import { AdminShell } from '@/features/admin/components/shell/AdminShell';
import { currentPageUser } from '@/server/auth/session';
import '@/styles/admin.css';
import '@/styles/admin-advertising.css';
export const metadata: Metadata = {
  title: { default: 'Quản trị', template: '%s | Vườn quản trị' },
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell initialUser={await currentPageUser()}>{children}</AdminShell>;
}
