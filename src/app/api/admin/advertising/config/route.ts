import { apiRoute, apiSuccess } from '@/server/http/response';
import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { requireUser } from '@/server/auth/session';
import { consumeAuthLimit } from '@/server/auth/rateLimit';
import { getAdminAdvertising, saveAdvertising } from '@/server/advertising/repository';
export const runtime = 'nodejs';
export const GET = apiRoute(async (request, context) => apiSuccess(await getAdminAdvertising(await requireUser(request)), context));
export const PUT = apiRoute(async (request, context) => {
  assertTrustedOrigin(request); const user = await requireUser(request);
  await consumeAuthLimit('advertising-save', user.id, 120);
  return apiSuccess(await saveAdvertising(user, await readAuthJson(request, 2 * 1024 * 1024)), context);
});
