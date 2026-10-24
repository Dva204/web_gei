import { apiRoute, apiSuccess } from '@/server/http/response';
import { requireUser } from '@/server/auth/session';
import { writeContext } from '@/server/catalog/common';
import { listChapters, saveChapter } from '@/server/chapters/repository';
export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, route: Context) {
  return apiRoute(async (request, context) => apiSuccess(await listChapters(await requireUser(request), (await route.params).id, new URL(request.url).searchParams), context))(request);
}
export async function POST(request: Request, route: Context) {
  return apiRoute(async (request, context) => { const { user, input } = await writeContext(request); return apiSuccess(await saveChapter(user, (await route.params).id, input), context, 201); })(request);
}
