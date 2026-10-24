import { apiRoute, apiSuccess } from '@/server/http/response';
import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { createTakedown } from '@/server/moderation/repository';
export const runtime = 'nodejs';
export const POST = apiRoute(async (request, context) => {
  assertTrustedOrigin(request);
  return apiSuccess(await createTakedown(await readAuthJson(request, 16 * 1024)), context, 201);
});
