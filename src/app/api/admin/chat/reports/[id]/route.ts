import { apiRoute, apiSuccess } from '@/server/http/response';
import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { requireUser } from '@/server/auth/session';
import { consumeAuthLimit } from '@/server/auth/rateLimit';
import { resolveChatReport } from '@/server/chat/repository';
export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, route: Context) {
  return apiRoute(async (request, context) => {
    assertTrustedOrigin(request); const user = await requireUser(request);
    await consumeAuthLimit('chat-moderation', user.id, 120);
    return apiSuccess(await resolveChatReport(user, (await route.params).id, await readAuthJson(request)), context);
  })(request);
}
