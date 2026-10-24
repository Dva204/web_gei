import { apiRoute, apiSuccess } from '@/server/http/response';
import { requireUser } from '@/server/auth/session';
import { assertTrustedOrigin } from '@/server/auth/security';
import { consumeAuthLimit } from '@/server/auth/rateLimit';
import { setBookmark } from '@/server/library/repository';
export const runtime = 'nodejs';
type Context = { params: Promise<{ storyId: string }> };
async function change(request: Request, route: Context, saved: boolean) {
  assertTrustedOrigin(request);
  const user = await requireUser(request);
  await consumeAuthLimit('library-write', user.id, 600);
  return setBookmark(user, (await route.params).storyId, saved);
}
export async function PUT(request: Request, route: Context) {
  return apiRoute(async (request, context) =>
    apiSuccess(await change(request, route, true), context),
  )(request);
}
export async function DELETE(request: Request, route: Context) {
  return apiRoute(async (request, context) =>
    apiSuccess(await change(request, route, false), context),
  )(request);
}
