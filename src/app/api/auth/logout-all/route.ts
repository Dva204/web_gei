import { apiRoute, apiSuccess } from '@/server/http/response';
import { assertTrustedOrigin } from '@/server/auth/security';
import { clearSessionCookie, requireUser } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
export const POST = apiRoute(async (request, context) => {
  assertTrustedOrigin(request);
  const user = await requireUser(request);
  await prisma.$transaction(async tx => {
    // Serialize revocation with session issuance for this account.
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.auditLog.create({ data: { userId: user.id, action: 'auth.logout_all', objectType: 'user', objectId: user.id, summary: 'Thu hồi tất cả phiên đăng nhập' } });
  });
  const response = apiSuccess({ signedOut: true }, context);
  clearSessionCookie(response, request);
  return response;
});
