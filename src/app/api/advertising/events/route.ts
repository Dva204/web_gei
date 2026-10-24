import { apiRoute, apiSuccess } from '@/server/http/response';
import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { requestToken, sessionUser } from '@/server/auth/session';
import { recordAdvertisingEvent } from '@/server/advertising/repository';
export const runtime = 'nodejs';
export const POST = apiRoute(async (request, context) => {
  assertTrustedOrigin(request);
  return apiSuccess(await recordAdvertisingEvent(await sessionUser(requestToken(request)), await readAuthJson(request)), context, 201);
});
