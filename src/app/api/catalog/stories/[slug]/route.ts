import { apiRoute, apiSuccess } from '@/server/http/response';
import { getPublicStory } from '@/server/catalog/public';
import { ApiError } from '@/server/http/errors';
export const runtime = 'nodejs';
export async function GET(
  request: Request,
  route: { params: Promise<{ slug: string }> },
) {
  return apiRoute(async (_request, context) => {
    const story = await getPublicStory((await route.params).slug);
    if (!story) throw new ApiError('NOT_FOUND', 'Không tìm thấy truyện.');
    return apiSuccess(story, context);
  })(request);
}
