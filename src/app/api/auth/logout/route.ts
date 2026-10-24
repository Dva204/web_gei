import { apiRoute, apiSuccess } from '@/server/http/response';
import { assertTrustedOrigin } from '@/server/auth/security';
import { clearSessionCookie, requestToken, tokenDigest } from '@/server/auth/session';
import { prisma } from '@/server/db/prisma';
export const POST = apiRoute(async (request, context) => {
  assertTrustedOrigin(request);
  const token = requestToken(request);
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) await prisma.session.deleteMany({ where: { tokenHash: tokenDigest(token) } });
  const response = apiSuccess({ signedOut: true }, context);
  clearSessionCookie(response, request);
  return response;
});
