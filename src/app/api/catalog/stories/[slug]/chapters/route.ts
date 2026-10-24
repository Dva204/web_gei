import { apiRoute, apiSuccess } from '@/server/http/response';
import { getPublicStory, listPublicChapters } from '@/server/catalog/public';
import { pageQuery } from '@/server/catalog/input';
import { ApiError } from '@/server/http/errors';
export const runtime = 'nodejs';
export async function GET(
  request: Request,
  route: { params: Promise<{ slug: string }> },
) {
  return apiRoute(async (request, context) => {
    const { slug } = await route.params;
    if (!(await getPublicStory(slug)))
      throw new ApiError('NOT_FOUND', 'Không tìm thấy truyện.');
    const { page, pageSize } = pageQuery(new URL(request.url).searchParams);
    return apiSuccess(await listPublicChapters(slug, page, pageSize), context);
  })(request);
}
