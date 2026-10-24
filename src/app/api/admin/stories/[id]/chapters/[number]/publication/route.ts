import { apiRoute, apiSuccess } from '@/server/http/response';
import { writeContext } from '@/server/catalog/common';
import { publicationAction } from '@/server/chapters/repository';
export const runtime = 'nodejs';
export async function POST(request: Request, route: { params: Promise<{ id: string; number: string }> }) {
  return apiRoute(async (request, context) => { const { user, input } = await writeContext(request), { id, number } = await route.params; return apiSuccess(await publicationAction(user, id, number, input), context); })(request);
}
