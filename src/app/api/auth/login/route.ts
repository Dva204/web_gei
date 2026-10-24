import { apiRoute, apiSuccess } from '@/server/http/response';
import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { credentials } from '@/server/auth/input';
import { consumeAuthLimit } from '@/server/auth/rateLimit';
import { loginAccount } from '@/server/auth/accounts';
import { requestToken, setSessionCookie } from '@/server/auth/session';
export const runtime = 'nodejs';
export const POST = apiRoute(async (request, context) => {
  assertTrustedOrigin(request);
  await consumeAuthLimit('login-global', '*', 200);
  const input = credentials(await readAuthJson(request));
  await consumeAuthLimit('login-email', input.email, 5);
  const result = await loginAccount(input, requestToken(request));
  const response = apiSuccess({ user: result.user }, context);
  setSessionCookie(response, request, result.token, result.expiresAt);
  return response;
});
