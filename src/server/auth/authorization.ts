import 'server-only';
import { redirect } from 'next/navigation';
import { prisma } from '../db/prisma';
import { ApiError } from '../http/errors';
import { currentPageUser } from './session';
import { permissionDecision, type Permission } from '@/shared/lib/auth/permissions';
import type { SessionUser } from '@/shared/lib/auth/types';

export async function requirePermission(user: SessionUser, permission: Permission, storyId?: string) {
  const decision = permissionDecision(user.role, permission);
  if (decision === 'grant') return;
  if ((decision === 'author' || decision === 'beta') && storyId) {
    const assigned = await prisma.storyAssignment.findUnique({
      where: { userId_storyId_kind: { userId: user.id, storyId, kind: decision } }, select: { userId: true },
    });
    if (assigned) return;
  }
  throw new ApiError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.');
}
export async function requireStaffPage(permission: Permission, storyId?: string) {
  const user = await currentPageUser();
  if (!user) redirect('/admin/dang-nhap');
  if (user.role === 'member') redirect('/admin/403');
  const decision = permissionDecision(user.role, permission);
  // Assigned staff may enter list screens; repositories must filter their actual assignments.
  if (!storyId && (decision === 'author' || decision === 'beta')) return user;
  try { await requirePermission(user, permission, storyId); } catch (error) {
    if (error instanceof ApiError && error.code === 'FORBIDDEN') redirect('/admin/403');
    throw error;
  }
  return user;
}
