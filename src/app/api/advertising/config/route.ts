import { apiRoute, apiSuccess } from '@/server/http/response';
import { getPublicAdvertising } from '@/server/advertising/repository';
export const runtime = 'nodejs';
export const GET = apiRoute(async (_request, context) => apiSuccess(await getPublicAdvertising(), context));
