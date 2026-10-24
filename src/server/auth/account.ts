import 'server-only';
import { prisma } from '../db/prisma';
import { ApiError } from '../http/errors';
import { consumeAuthLimit } from './rateLimit';
import { hashPassword, validPassword, verifyPassword } from './password';
import { tokenDigest } from './session';
import { exact } from '../catalog/input';
import type { SessionUser } from '@/shared/lib/auth/types';

export async function updateProfile(
  user: SessionUser,
  input: Record<string, unknown>,
) {
  exact(input, ['name']);
  if (
    typeof input.name !== 'string' ||
    input.name.trim().length < 2 ||
    input.name.trim().length > 80
  )
    throw new ApiError(
      'INVALID_REQUEST',
      'Tên hiển thị cần từ 2 đến 80 ký tự.',
    );
  const row = await prisma.user.update({
    where: { id: user.id },
    data: { name: input.name.trim() },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  return { ...row, createdAt: row.createdAt.toISOString() };
}
export async function changePassword(
  user: SessionUser,
  token: string | undefined,
  input: Record<string, unknown>,
) {
  exact(input, ['currentPassword', 'newPassword', 'revokeOtherSessions']);
  if (
    typeof input.currentPassword !== 'string' ||
    !validPassword(input.newPassword)
  )
    throw new ApiError(
      'INVALID_REQUEST',
      'Mật khẩu hiện tại và mật khẩu mới từ 12 đến 128 ký tự.',
    );
  if (input.currentPassword === input.newPassword)
    throw new ApiError(
      'INVALID_REQUEST',
      'Mật khẩu mới phải khác mật khẩu hiện tại.',
    );
  if (typeof input.revokeOtherSessions !== 'boolean')
    throw new ApiError(
      'INVALID_REQUEST',
      'Tùy chọn phiên đăng nhập không hợp lệ.',
    );
  await consumeAuthLimit('password-change', user.id, 5);
  const before = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  const valid = await verifyPassword(
    input.currentPassword,
    before?.passwordHash || null,
  );
  if (!valid)
    throw new ApiError('UNAUTHENTICATED', 'Mật khẩu hiện tại không đúng.');
  const next = await hashPassword(input.newPassword);
  const digest = token ? tokenDigest(token) : '';
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
    const current = await tx.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!current || current.passwordHash !== before?.passwordHash)
      throw new ApiError(
        'CONFLICT',
        'Mật khẩu vừa thay đổi ở phiên khác. Hãy thử lại.',
      );
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash: next },
    });
    if (input.revokeOtherSessions)
      await tx.session.deleteMany({
        where: { userId: user.id, tokenHash: { not: digest } },
      });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'auth.password_change',
        objectType: 'user',
        objectId: user.id,
        summary: input.revokeOtherSessions
          ? 'Đổi mật khẩu và thu hồi các phiên khác'
          : 'Đổi mật khẩu',
      },
    });
  });
  return { changed: true, revokedOtherSessions: input.revokeOtherSessions };
}
export async function sessions(user: SessionUser, token: string | undefined) {
  const digest = token ? tokenDigest(token) : '';
  const rows = await prisma.session.findMany({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  return rows.map((row) => ({
    id: row.id,
    current: row.tokenHash === digest,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  }));
}
export async function revokeSession(
  user: SessionUser,
  token: string | undefined,
  id: string,
) {
  if (!id || id.length > 128)
    throw new ApiError('INVALID_REQUEST', 'ID phiên không hợp lệ.');
  const digest = token ? tokenDigest(token) : '';
  const row = await prisma.session.findFirst({
    where: { id, userId: user.id },
    select: { id: true, tokenHash: true },
  });
  if (!row)
    throw new ApiError('NOT_FOUND', 'Phiên đăng nhập không còn tồn tại.');
  await prisma.session.delete({ where: { id: row.id } });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'auth.session_revoke',
      objectType: 'session',
      objectId: row.id,
      summary: 'Thu hồi một phiên đăng nhập',
    },
  });
  return { revoked: true, current: row.tokenHash === digest };
}
