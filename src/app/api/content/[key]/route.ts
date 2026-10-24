import { apiRoute, apiSuccess } from '@/server/http/response';
import { getPublicContent } from '@/server/operations/repository';

export const runtime = 'nodejs';
type Context = { params: Promise<{ key: string }> };
export async function GET(request: Request, route: Context) {
  return apiRoute(async (_request, context) => {
    const { key } = await route.params;
    return apiSuccess(await getPublicContent(key), context);
  })(request);
}
