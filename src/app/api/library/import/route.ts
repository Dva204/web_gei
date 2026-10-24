import { apiRoute, apiSuccess } from '@/server/http/response';
import { requireUser } from '@/server/auth/session';
import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { consumeAuthLimit } from '@/server/auth/rateLimit';
import { importLibrary } from '@/server/library/repository';
export const runtime = 'nodejs';
export const POST = apiRoute(async (request, context) => {
  assertTrustedOrigin(request);
  const user = await requireUser(request);
  await consumeAuthLimit('library-import', user.id, 10);
  return apiSuccess(
    await importLibrary(user, await readAuthJson(request, 64 * 1024)),
    context,
  );
});
