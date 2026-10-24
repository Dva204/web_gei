import { requireUser } from '@/server/auth/session';
import { apiRoute, apiSuccess } from '@/server/http/response';
import { getAdminUserDetail } from '@/server/users/repository';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, route: Context) {
  return apiRoute(async (request, context) => apiSuccess(await getAdminUserDetail(await requireUser(request), (await route.params).id), context))(request);
}
