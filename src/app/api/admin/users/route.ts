import { requireUser } from '@/server/auth/session';
import { apiRoute, apiSuccess } from '@/server/http/response';
import { listAdminUsers } from '@/server/users/repository';

export const runtime = 'nodejs';
export const GET = apiRoute(async (request, context) => apiSuccess(await listAdminUsers(await requireUser(request), new URL(request.url)), context));
