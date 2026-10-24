'use client';
import type { SessionUser } from '@/shared/lib/auth/types';
export async function authRequest<T>(
  path: string,
  body?: Record<string, unknown>,
  method?: string,
): Promise<T> {
  const response = await fetch(path, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    credentials: 'same-origin',
    cache: 'no-store',
    ...(body === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.data)
    throw new Error(
      payload?.error?.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.',
    );
  if (typeof window !== 'undefined' && body !== undefined)
    window.dispatchEvent(new Event('vuon-auth-change'));
  return payload.data as T;
}
export const getSession = () =>
  authRequest<{ user: SessionUser | null }>('/api/auth/me');
export const signOut = (all = false) =>
  authRequest('/api/auth/' + (all ? 'logout-all' : 'logout'), {});
export type AccountSession = {
  id: string;
  current: boolean;
  createdAt: string;
  expiresAt: string;
};
export const updateProfile = (name: string) =>
  authRequest<{ user: SessionUser }>(
    '/api/auth/profile',
    { name },
    'PATCH',
  ).then((data) => data.user);
export const changePassword = (
  currentPassword: string,
  newPassword: string,
  revokeOtherSessions: boolean,
) =>
  authRequest('/api/auth/password', {
    currentPassword,
    newPassword,
    revokeOtherSessions,
  });
export const listSessions = () =>
  authRequest<AccountSession[]>('/api/auth/sessions');
export const revokeSession = (id: string) =>
  authRequest<{ revoked: boolean; current: boolean }>(
    '/api/auth/sessions/' + encodeURIComponent(id),
    {},
    'DELETE',
  );
