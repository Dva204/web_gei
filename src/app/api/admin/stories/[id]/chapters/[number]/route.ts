import { apiRoute, apiSuccess } from '@/server/http/response';
import { requireUser } from '@/server/auth/session';
import { writeContext } from '@/server/catalog/common';
import { getChapter, saveChapter, deleteChapter } from '@/server/chapters/repository';
export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string; number: string }> };
export async function GET(request: Request, route: Context) {
  return apiRoute(async (request, context) => { const { id, number } = await route.params; return apiSuccess(await getChapter(await requireUser(request), id, number), context); })(request);
}
export async function PUT(request: Request, route: Context) {
  return apiRoute(async (request, context) => { const { user, input } = await writeContext(request), { id, number } = await route.params; return apiSuccess(await saveChapter(user, id, input, number), context); })(request);
}
export async function DELETE(request: Request, route: Context) {
  return apiRoute(async (request, context) => { const { user, input } = await writeContext(request), { id, number } = await route.params; return apiSuccess(await deleteChapter(user, id, number, input), context); })(request);
}
