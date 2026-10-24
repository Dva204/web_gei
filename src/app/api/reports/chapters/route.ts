import { apiRoute, apiSuccess } from '@/server/http/response';
import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { requireUser } from '@/server/auth/session';
import { createChapterReport } from '@/server/moderation/repository';
export const runtime = 'nodejs';
export const POST = apiRoute(async (request, context) => {
  assertTrustedOrigin(request);
  return apiSuccess(await createChapterReport(await requireUser(request), await readAuthJson(request)), context, 201);
});
