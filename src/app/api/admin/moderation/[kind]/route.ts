import { apiRoute, apiSuccess } from '@/server/http/response';
import { requireUser } from '@/server/auth/session';
import { listModeration } from '@/server/moderation/repository';
export const runtime = 'nodejs';
type Context = { params: Promise<{ kind: string }> };
export async function GET(request: Request, route: Context) {
  return apiRoute(async (request, context) =>
    apiSuccess(await listModeration((await route.params).kind, await requireUser(request), new URL(request.url)), context),
  )(request);
}
