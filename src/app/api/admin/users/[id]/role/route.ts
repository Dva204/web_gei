import { consumeAuthLimit } from '@/server/auth/rateLimit';
import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { requireUser } from '@/server/auth/session';
import { apiRoute, apiSuccess } from '@/server/http/response';
import { updateUserRole } from '@/server/users/repository';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, route: Context) {
  return apiRoute(async (request, context) => {
    assertTrustedOrigin(request);
    const actor = await requireUser(request);
    await consumeAuthLimit('user-role', actor.id, 40);
    return apiSuccess(await updateUserRole(actor, (await route.params).id, await readAuthJson(request)), context);
  })(request);
}
