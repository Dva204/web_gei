import { apiRoute, apiSuccess } from '@/server/http/response';
import { uploadMedia } from '@/server/media/upload';
export const runtime = 'nodejs';
export async function POST(request: Request, route: { params: Promise<{ id: string }> }) {
  return apiRoute(async (request, context) => apiSuccess(await uploadMedia(request, (await route.params).id), context, 201))(request);
}
