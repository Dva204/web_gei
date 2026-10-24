import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { requireUser } from '@/server/auth/session';
import { apiRoute, apiSuccess } from '@/server/http/response';
import { listRedirects, saveRedirect } from '@/server/operations/repository';
import { consumeAuthLimit } from '@/server/auth/rateLimit';

export const runtime = 'nodejs';
export const GET = apiRoute(async (request, context) => apiSuccess(await listRedirects(await requireUser(request)), context));
export const POST = apiRoute(async (request, context) => {
  assertTrustedOrigin(request);
  const user = await requireUser(request);
  await consumeAuthLimit('operations-write', user.id, 120);
  return apiSuccess(await saveRedirect(user, await readAuthJson(request)), context, 201);
});
export const PUT = POST;
