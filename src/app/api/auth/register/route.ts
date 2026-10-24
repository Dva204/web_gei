import { apiRoute, apiSuccess } from '@/server/http/response';
import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { credentials } from '@/server/auth/input';
import { consumeAuthLimit } from '@/server/auth/rateLimit';
import { registerAccount } from '@/server/auth/accounts';
import { requestToken, setSessionCookie } from '@/server/auth/session';
export const runtime = 'nodejs';
export const POST = apiRoute(async (request, context) => {
  assertTrustedOrigin(request);
  await consumeAuthLimit('register-global', '*', 30);
  const input = credentials(await readAuthJson(request), true);
  await consumeAuthLimit('register-email', input.email, 3);
  const result = await registerAccount(input, requestToken(request));
  const response = apiSuccess({ user: result.user }, context, 201);
  setSessionCookie(response, request, result.token, result.expiresAt);
  return response;
});
