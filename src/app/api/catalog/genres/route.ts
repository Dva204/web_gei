import { apiRoute, apiSuccess } from '@/server/http/response';
import { publicGenres } from '@/server/catalog/public';
export const runtime = 'nodejs';
export const GET = apiRoute(async (_request, context) =>
  apiSuccess(await publicGenres(), context),
);
