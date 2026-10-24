import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { requireUser } from '@/server/auth/session';
import { apiRoute, apiSuccess } from '@/server/http/response';
import { getSiteSettings, saveSiteSettings } from '@/server/operations/repository';
import { consumeAuthLimit } from '@/server/auth/rateLimit';

export const runtime = 'nodejs';
export const GET = apiRoute(async (request, context) => apiSuccess(await getSiteSettings(await requireUser(request)), context));
export const PUT = apiRoute(async (request, context) => {
  assertTrustedOrigin(request);
  const user = await requireUser(request);
  await consumeAuthLimit('operations-write', user.id, 120);
  return apiSuccess(await saveSiteSettings(user, await readAuthJson(request, 32 * 1024)), context);
});
