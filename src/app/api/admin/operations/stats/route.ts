import { requireUser } from '@/server/auth/session';
import { apiRoute, apiSuccess } from '@/server/http/response';
import { getOperationalStats } from '@/server/operations/repository';

export const runtime = 'nodejs';
export const GET = apiRoute(async (request, context) => apiSuccess(await getOperationalStats(await requireUser(request), new URL(request.url).searchParams.get('range')), context));
