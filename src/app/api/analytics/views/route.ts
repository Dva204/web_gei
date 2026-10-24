import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { requestToken, sessionUser } from '@/server/auth/session';
import { apiRoute, apiSuccess } from '@/server/http/response';
import { recordPageView } from '@/server/operations/repository';

export const runtime = 'nodejs';
export const POST = apiRoute(async (request, context) => {
  assertTrustedOrigin(request);
  const user = await sessionUser(requestToken(request));
  return apiSuccess(await recordPageView(user, await readAuthJson(request)), context, 201);
});
