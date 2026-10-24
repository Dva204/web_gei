import 'server-only';

import { Prisma, type UserRole, type UserStatus } from '@prisma/client';
import type { SessionUser } from '@/shared/lib/auth/types';
import { permissionDecision } from '@/shared/lib/auth/permissions';
import { prisma } from '../db/prisma';
import { ApiError } from '../http/errors';
import { actorInTransaction, grant, transaction } from '../catalog/common';
import { enumValue, exact, idValue, pageQuery, text } from '../catalog/input';

const roles = ['member', 'admin', 'mod', 'editor', 'author', 'beta'] as const;
const statuses = ['active', 'suspended', 'disabled'] as const;
const listSelect = {
  id: true, name: true, email: true, role: true, status: true, createdAt: true,
  sessions: { orderBy: { createdAt: 'desc' as const }, take: 1, select: { createdAt: true } },
} satisfies Prisma.UserSelect;

type ListedUser = Prisma.UserGetPayload<{ select: typeof listSelect }>;
function userDto(row: ListedUser) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    twoFactor: false,
    lastLoginAt: row.sessions[0]?.createdAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function canReadUsers(user: SessionUser) {
  if (permissionDecision(user.role, 'users.sanction') !== 'grant' && permissionDecision(user.role, 'users.roles') !== 'grant') {
    throw new ApiError('FORBIDDEN', 'Bạn không có quyền xem người dùng.');
  }
}

export async function listAdminUsers(user: SessionUser, url: URL) {
  canReadUsers(user);
  const { page, pageSize } = pageQuery(url.searchParams, 100);
  const search = (url.searchParams.get('search') || '').trim().slice(0, 120);
  const roleRaw = url.searchParams.get('role');
  const statusRaw = url.searchParams.get('status');
  const role = roleRaw ? enumValue(roleRaw, roles, 'Vai trò') : undefined;
  const status = statusRaw ? enumValue(statusRaw, statuses, 'Trạng thái') : undefined;
  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(search ? { OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search.toLowerCase(), mode: 'insensitive' } },
    ] } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select: listSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.user.count({ where }),
  ]);
  return { items: items.map(userDto), page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getAdminUserDetail(user: SessionUser, rawId: string) {
  canReadUsers(user);
  const id = idValue(rawId);
  const row = await prisma.user.findUnique({
    where: { id },
    select: {
      ...listSelect,
      _count: { select: { sessions: true, bookmarks: true, history: true, comments: true, assignments: true } },
      assignments: { select: { kind: true, createdAt: true, story: { select: { id: true, title: true, slug: true } } }, orderBy: { createdAt: 'desc' }, take: 50 },
      auditLogs: { select: { id: true, action: true, summary: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });
  if (!row) throw new ApiError('NOT_FOUND', 'Không tìm thấy tài khoản.');
  const accountEvents = await prisma.auditLog.findMany({
    where: { objectType: 'user', objectId: id },
    select: { id: true, action: true, summary: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return {
    ...userDto(row),
    counts: row._count,
    assignments: row.assignments.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
    audit: row.auditLogs.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
    accountEvents: accountEvents.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
  };
}

export async function updateUserStatus(actor: SessionUser, rawId: string, input: Record<string, unknown>) {
  exact(input, ['status', 'reason']);
  const id = idValue(rawId);
  const status = enumValue(input.status, statuses, 'Trạng thái');
  const reason = text(input.reason, 'Lý do', 500, true);
  if (reason.length < 8) throw new ApiError('INVALID_REQUEST', 'Lý do phải có ít nhất 8 ký tự.');
  if (id === actor.id) throw new ApiError('FORBIDDEN', 'Không tự khóa tài khoản của mình.');
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(70421004)::text`;
    const freshActor = await actorInTransaction(tx, actor);
    grant(freshActor, 'users.sanction');
    const target = await tx.user.findUnique({ where: { id }, select: { ...listSelect } });
    if (!target) throw new ApiError('NOT_FOUND', 'Không tìm thấy tài khoản.');
    if (freshActor.role !== 'admin' && (target.role !== 'member' || status === 'disabled')) {
      throw new ApiError('FORBIDDEN', 'Chỉ admin được xử lý tài khoản nhân sự hoặc vô hiệu hóa tài khoản.');
    }
    if (target.role === 'admin' && status !== 'active' && await tx.user.count({ where: { role: 'admin', status: 'active' } }) <= 1) {
      throw new ApiError('CONFLICT', 'Không khóa quản trị viên hoạt động cuối cùng.');
    }
    const updated = await tx.user.update({ where: { id }, data: { status }, select: listSelect });
    if (status !== 'active') await tx.session.deleteMany({ where: { userId: id } });
    await tx.auditLog.create({ data: { userId: freshActor.id, action: 'users.status', objectType: 'user', objectId: id, summary: `${target.status} → ${status}: ${reason}` } });
    return userDto(updated);
  });
}

export async function updateUserRole(actor: SessionUser, rawId: string, input: Record<string, unknown>) {
  exact(input, ['role', 'reason']);
  const id = idValue(rawId);
  const role = enumValue(input.role, roles, 'Vai trò');
  const reason = text(input.reason, 'Lý do', 500, true);
  if (reason.length < 8) throw new ApiError('INVALID_REQUEST', 'Lý do phải có ít nhất 8 ký tự.');
  if (id === actor.id) throw new ApiError('FORBIDDEN', 'Không tự thay đổi vai trò của mình.');
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(70421004)::text`;
    const freshActor = await actorInTransaction(tx, actor);
    grant(freshActor, 'users.roles');
    const target = await tx.user.findUnique({ where: { id }, select: { ...listSelect } });
    if (!target) throw new ApiError('NOT_FOUND', 'Không tìm thấy tài khoản.');
    if (target.role === 'admin' && role !== 'admin' && await tx.user.count({ where: { role: 'admin', status: 'active' } }) <= 1) {
      throw new ApiError('CONFLICT', 'Không hạ quyền quản trị viên hoạt động cuối cùng.');
    }
    const updated = await tx.user.update({ where: { id }, data: { role }, select: listSelect });
    await tx.session.deleteMany({ where: { userId: id } });
    await tx.auditLog.create({ data: { userId: freshActor.id, action: 'users.role', objectType: 'user', objectId: id, summary: `${target.role} → ${role}: ${reason}` } });
    return userDto(updated);
  });
}

export type AdminUserRole = UserRole;
export type AdminUserStatus = UserStatus;
