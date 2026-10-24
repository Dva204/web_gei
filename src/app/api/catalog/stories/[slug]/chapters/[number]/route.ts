import { apiRoute, apiSuccess } from '@/server/http/response';
import { getPublicChapter } from '@/server/catalog/public';
import { ApiError } from '@/server/http/errors';
export const runtime = 'nodejs';
export async function GET(
  request: Request,
  route: { params: Promise<{ slug: string; number: string }> },
) {
  return apiRoute(async (_request, context) => {
    const { slug, number } = await route.params;
    const data = /^\d+$/.test(number)
      ? await getPublicChapter(slug, Number(number))
      : null;
    if (!data)
      throw new ApiError('NOT_FOUND', 'Không tìm thấy chap đã xuất bản.');
    return apiSuccess(data, context);
  })(request);
}
