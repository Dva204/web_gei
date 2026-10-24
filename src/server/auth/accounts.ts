import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { ApiError } from '../http/errors';
import { hashPassword, verifyPassword } from './password';
import { withPasswordCapacity } from './security';
import { issueSession, safeUserSelect, userDto } from './session';

export async function registerAccount(input: { email: string; name: string; password: string }, previousToken?: string) {
  const passwordHash = await withPasswordCapacity(() => hashPassword(input.password));
  try {
    return await prisma.$transaction(async tx => {
      const row = await tx.user.create({ data: { email: input.email, name: input.name, passwordHash, role: 'member', status: 'active' }, select: safeUserSelect });
      const session = await issueSession(tx, row.id, previousToken);
      await tx.auditLog.create({ data: { userId: row.id, action: 'auth.register', objectType: 'user', objectId: row.id, summary: 'Tạo tài khoản thành viên' } });
      return { user: userDto(row), ...session };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApiError('CONFLICT', 'Không thể tạo tài khoản với email này.');
    }
    throw error;
  }
}
export async function loginAccount(input: { email: string; password: string; admin: boolean }, previousToken?: string) {
  const row = await prisma.user.findUnique({ where: { email: input.email }, select: { ...safeUserSelect, passwordHash: true, status: true } });
  const valid = await withPasswordCapacity(() => verifyPassword(input.password, row?.passwordHash || null));
  if (!row || !valid || row.status !== 'active') throw new ApiError('UNAUTHENTICATED', 'Email hoặc mật khẩu không đúng, hoặc tài khoản không khả dụng.');
  if (input.admin && row.role === 'member') throw new ApiError('FORBIDDEN', 'Tài khoản này không có quyền quản trị.');
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${row.id} FOR UPDATE`;
    // Re-check current password/status after slow verification; never issue from stale credentials.
    const fresh = await tx.user.findUnique({ where: { id: row.id }, select: { ...safeUserSelect, passwordHash: true, status: true } });
    if (!fresh || fresh.status !== 'active' || fresh.passwordHash !== row.passwordHash) throw new ApiError('UNAUTHENTICATED', 'Tài khoản đã thay đổi. Vui lòng đăng nhập lại.');
    if (input.admin && fresh.role === 'member') throw new ApiError('FORBIDDEN', 'Tài khoản này không có quyền quản trị.');
    const session = await issueSession(tx, fresh.id, previousToken);
    await tx.auditLog.create({ data: { userId: fresh.id, action: 'auth.login', objectType: 'user', objectId: fresh.id, summary: 'Đăng nhập bằng mật khẩu' } });
    return { user: userDto({ id: fresh.id, name: fresh.name, email: fresh.email, role: fresh.role, createdAt: fresh.createdAt }), ...session };
  });
}
