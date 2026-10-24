import { apiRoute, apiSuccess } from '@/server/http/response';
import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { requireUser } from '@/server/auth/session';
import { consumeAuthLimit } from '@/server/auth/rateLimit';
import { updateUserStatus } from '@/server/users/repository';

export const runtime = 'nodejs';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return apiRoute(async (request, apiContext) => {
    assertTrustedOrigin(request);
    const actor = await requireUser(request);
    await consumeAuthLimit('sanction-user', actor.id, 40);
    return apiSuccess(await updateUserStatus(actor, id, await readAuthJson(request)), apiContext);
  })(request);
}
