import { apiRoute, apiSuccess } from '@/server/http/response';
import { listPublicStories } from '@/server/catalog/public';
import { enumValue, pageQuery, text } from '@/server/catalog/input';
export const runtime = 'nodejs';
export const GET = apiRoute(async (request, context) => {
  const query = new URL(request.url).searchParams;
  const paging = pageQuery(query);
  return apiSuccess(
    await listPublicStories({
      ...paging,
      search: text(query.get('search'), 'Tìm kiếm', 200),
      genre: text(query.get('genre'), 'Thể loại', 120),
      status: query.get('status')
        ? enumValue(
            query.get('status'),
            ['ongoing', 'full', 'paused'] as const,
            'Trạng thái',
          )
        : undefined,
      ending: query.get('ending')
        ? enumValue(
            query.get('ending'),
            ['HE', 'SE', 'OE'] as const,
            'Kết thúc',
          )
        : undefined,
      sort: query.get('sort')
        ? enumValue(
            query.get('sort'),
            ['updated', 'views', 'rating', 'new'] as const,
            'Sắp xếp',
          )
        : undefined,
      minChapters: query.has('minChapters')
        ? Number(query.get('minChapters'))
        : undefined,
      maxChapters: query.has('maxChapters')
        ? Number(query.get('maxChapters'))
        : undefined,
    }),
    context,
  );
});
