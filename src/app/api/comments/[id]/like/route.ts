import { apiRoute, apiSuccess } from '@/server/http/response';
import { assertTrustedOrigin } from '@/server/auth/security';
import { requireUser } from '@/server/auth/session';
import { toggleCommentLike } from '@/server/moderation/repository';
export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, route: Context) {
  return apiRoute(async (request, context) => {
    assertTrustedOrigin(request);
    return apiSuccess(await toggleCommentLike(await requireUser(request), (await route.params).id), context);
  })(request);
}
