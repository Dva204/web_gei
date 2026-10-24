import { apiRoute, apiSuccess } from '@/server/http/response';
import { requireUser } from '@/server/auth/session';
import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { consumeAuthLimit } from '@/server/auth/rateLimit';
import { clearLibrary, library } from '@/server/library/repository';
export const runtime = 'nodejs';
export const GET = apiRoute(async (request, context) =>
  apiSuccess(await library(await requireUser(request)), context),
);
export const DELETE = apiRoute(async (request, context) => {
  assertTrustedOrigin(request);
  const user = await requireUser(request);
  await consumeAuthLimit('library-write', user.id, 600);
  return apiSuccess(
    await clearLibrary(user, await readAuthJson(request)),
    context,
  );
});
