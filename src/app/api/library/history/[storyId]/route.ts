import { apiRoute, apiSuccess } from '@/server/http/response';
import { requireUser } from '@/server/auth/session';
import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { consumeAuthLimit } from '@/server/auth/rateLimit';
import { removeProgress, setProgress } from '@/server/library/repository';
export const runtime = 'nodejs';
type Context = { params: Promise<{ storyId: string }> };
export async function PUT(request: Request, route: Context) {
  return apiRoute(async (request, context) => {
    assertTrustedOrigin(request);
    const user = await requireUser(request);
    await consumeAuthLimit('reading-progress', user.id, 600);
    return apiSuccess(
      await setProgress(
        user,
        (await route.params).storyId,
        await readAuthJson(request),
      ),
      context,
    );
  })(request);
}
export async function DELETE(request: Request, route: Context) {
  return apiRoute(async (request, context) => {
    assertTrustedOrigin(request);
    const user = await requireUser(request);
    await consumeAuthLimit('library-write', user.id, 600);
    return apiSuccess(
      await removeProgress(user, (await route.params).storyId),
      context,
    );
  })(request);
}
