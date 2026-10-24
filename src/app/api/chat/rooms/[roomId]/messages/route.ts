import { apiRoute, apiSuccess } from '@/server/http/response';
import { assertTrustedOrigin, readAuthJson } from '@/server/auth/security';
import { requestToken, requireUser, sessionUser } from '@/server/auth/session';
import { listMessages, pinnedMessage, sendMessage } from '@/server/chat/repository';
export const runtime = 'nodejs';
type Context = { params: Promise<{ roomId: string }> };
export async function GET(request: Request, route: Context) {
  return apiRoute(async (request, context) => {
    const user = await sessionUser(requestToken(request)), roomId = (await route.params).roomId, url = new URL(request.url);
    return apiSuccess(url.searchParams.get('pinned') === '1' ? await pinnedMessage(roomId, user) : await listMessages(roomId, url, user), context);
  })(request);
}
export async function POST(request: Request, route: Context) {
  return apiRoute(async (request, context) => {
    assertTrustedOrigin(request);
    return apiSuccess(await sendMessage(await requireUser(request), (await route.params).roomId, await readAuthJson(request)), context, 201);
  })(request);
}
