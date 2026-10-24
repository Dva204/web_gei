import { requireUser } from '@/server/auth/session';
import { apiRoute, apiSuccess } from '@/server/http/response';
import { getDashboardOverview } from '@/server/operations/repository';

export const runtime = 'nodejs';
export const GET = apiRoute(async (request, context) => apiSuccess(await getDashboardOverview(await requireUser(request)), context));
