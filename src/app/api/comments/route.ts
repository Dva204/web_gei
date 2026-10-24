import { apiRoute, apiSuccess } from '@/server/http/response';
import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { requestToken, requireUser, sessionUser } from '@/server/auth/session';
import { createComment, listPublicComments } from '@/server/moderation/repository';
export const runtime = 'nodejs';
export const GET = apiRoute(async (request, context) =>
  apiSuccess(await listPublicComments(new URL(request.url), await sessionUser(requestToken(request))), context),
);
export const POST = apiRoute(async (request, context) => {
  assertTrustedOrigin(request);
  return apiSuccess(await createComment(await requireUser(request), await readAuthJson(request, 8 * 1024)), context, 201);
});
