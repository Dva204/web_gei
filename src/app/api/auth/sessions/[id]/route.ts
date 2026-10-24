import { apiRoute, apiSuccess } from '@/server/http/response';
import {
  clearSessionCookie,
  requestToken,
  requireUser,
} from '@/server/auth/session';
import { assertTrustedOrigin } from '@/server/auth/security';
import { consumeAuthLimit } from '@/server/auth/rateLimit';
import { revokeSession } from '@/server/auth/account';
export const runtime = 'nodejs';
export async function DELETE(
  request: Request,
  route: { params: Promise<{ id: string }> },
) {
  return apiRoute(async (request, context) => {
    assertTrustedOrigin(request);
    const user = await requireUser(request);
    await consumeAuthLimit('session-revoke', user.id, 30);
    const data = await revokeSession(
      user,
      requestToken(request),
      (await route.params).id,
    );
    const response = apiSuccess(data, context);
    if (data.current) clearSessionCookie(response, request);
    return response;
  })(request);
}
