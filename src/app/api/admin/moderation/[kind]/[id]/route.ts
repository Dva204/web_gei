import { apiRoute, apiSuccess } from '@/server/http/response';
import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { requireUser } from '@/server/auth/session';
import { consumeAuthLimit } from '@/server/auth/rateLimit';
import { moderate } from '@/server/moderation/repository';
export const runtime = 'nodejs';
type Context = { params: Promise<{ kind: string; id: string }> };
export async function PATCH(request: Request, route: Context) {
  return apiRoute(async (request, context) => {
    assertTrustedOrigin(request);
    const user = await requireUser(request);
    await consumeAuthLimit('moderation-write', user.id, 120);
    const { kind, id } = await route.params;
    return apiSuccess(await moderate(kind, id, user, await readAuthJson(request)), context);
  })(request);
}
