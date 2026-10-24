'use client';
import type { AdminUser } from '@/features/admin/types';
import type { SessionUser } from '@/shared/lib/auth/types';
import { authRequest, getSession, signOut } from '@/features/auth/services/client';
// Memory is a UI hint only; server pages/APIs verify the cookie and current DB role.
let current: AdminUser | null = null;
export function setAdminSession(user: SessionUser | null) {
  current = user && user.role !== 'member' ? { ...user, role: user.role, status: 'active', twoFactor: false } : null;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('admin-session'));
}
export async function refreshAdminSession() {
  const { user } = await getSession(); setAdminSession(user); return current;
}
export const getAdminSession = () => current;
export async function loginAdmin(email: string, password: string) {
  const { user } = await authRequest<{ user: SessionUser }>('/api/auth/login', { email, password, audience: 'admin' });
  setAdminSession(user); return current;
}
export async function logoutAdmin() { await signOut(); setAdminSession(null); }
