import { apiRoute, apiSuccess } from '@/server/http/response';
import { requireUser } from '@/server/auth/session';
import { writeContext } from '@/server/catalog/common';
import { listVersions, restoreVersion } from '@/server/chapters/repository';
export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string; number: string }> };
export async function GET(request: Request, route: Context) {
  return apiRoute(async (request, context) => { const { id, number } = await route.params; return apiSuccess(await listVersions(await requireUser(request), id, number), context); })(request);
}
export async function POST(request: Request, route: Context) {
  return apiRoute(async (request, context) => { const { user, input } = await writeContext(request), { id, number } = await route.params; return apiSuccess(await restoreVersion(user, id, number, input), context); })(request);
}
