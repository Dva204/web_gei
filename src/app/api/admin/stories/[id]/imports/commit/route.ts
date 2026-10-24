import { apiRoute, apiSuccess } from '@/server/http/response';
import { writeContext } from '@/server/catalog/common';
import { commitImport } from '@/server/chapters/imports';
export const runtime = 'nodejs';
export async function POST(request: Request, route: { params: Promise<{ id: string }> }) {
  return apiRoute(async (request, context) => { const { user, input } = await writeContext(request); return apiSuccess(await commitImport(user, (await route.params).id, input), context); })(request);
}
