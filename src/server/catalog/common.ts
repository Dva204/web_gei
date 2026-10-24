import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { ApiError } from '../http/errors';
import { requireUser } from '../auth/session';
import { assertTrustedOrigin, readAuthJson } from '../auth/security';
import { consumeAuthLimit } from '../auth/rateLimit';
import {
  permissionDecision,
  type Permission,
} from '@/shared/lib/auth/permissions';
import type { SessionUser } from '@/shared/lib/auth/types';

export async function writeContext(request: Request) {
  assertTrustedOrigin(request);
  const user = await requireUser(request);
  await consumeAuthLimit('catalog-write', user.id, 180);
  return { user, input: await readAuthJson(request, 32 * 1024) };
}
export function storyScope(
  user: SessionUser,
  permission: Permission = 'stories.view',
): Prisma.StoryWhereInput {
  const decision = permissionDecision(user.role, permission);
  if (decision === 'grant') return {};
  if (decision === 'author' || decision === 'beta')
    return { assignments: { some: { userId: user.id, kind: decision } } };
  throw new ApiError('FORBIDDEN', 'Bạn không có quyền truy cập truyện.');
}
export async function transaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { maxWait?: number; timeout?: number },
) {
  try {
    return await prisma.$transaction(operation, options);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        throw new ApiError(
          'CONFLICT',
          'Tên hoặc slug đã được sử dụng, kể cả trong thùng rác.',
        );
      if (error.code === 'P2025')
        throw new ApiError('NOT_FOUND', 'Không tìm thấy dữ liệu.');
      if (error.code === 'P2003')
        throw new ApiError('CONFLICT', 'Dữ liệu liên quan không còn hợp lệ.');
    }
    throw error;
  }
}
export async function actorInTransaction(
  tx: Prisma.TransactionClient,
  user: SessionUser,
) {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR SHARE`;
  const actor = await tx.user.findUnique({
    where: { id: user.id },
    select: { role: true, status: true },
  });
  if (!actor || actor.status !== 'active')
    throw new ApiError('UNAUTHENTICATED', 'Phiên đăng nhập không còn hợp lệ.');
  return { ...user, role: actor.role };
}
export function grant(user: SessionUser, permission: Permission) {
  if (permissionDecision(user.role, permission) !== 'grant')
    throw new ApiError(
      'FORBIDDEN',
      'Bạn không có quyền thực hiện thao tác này.',
    );
}
export function audit(
  tx: Prisma.TransactionClient,
  user: SessionUser,
  action: string,
  objectType: string,
  objectId: string,
) {
  return tx.auditLog.create({
    data: {
      userId: user.id,
      action,
      objectType,
      objectId,
      summary: `${action}: ${objectType}`,
    },
  });
}
