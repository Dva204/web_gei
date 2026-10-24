import { requireUser } from '@/server/auth/session';
import { apiRoute, apiSuccess } from '@/server/http/response';
import { exportSafeCatalog } from '@/server/operations/repository';

export const runtime = 'nodejs';
export const GET = apiRoute(async (request, context) => apiSuccess(await exportSafeCatalog(await requireUser(request)), context));
