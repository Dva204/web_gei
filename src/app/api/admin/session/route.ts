import { apiRoute, apiSuccess } from '@/server/http/response';
import { requireUser } from '@/server/auth/session';
import { requirePermission } from '@/server/auth/authorization';
export const GET = apiRoute(async (request, context) => {
  const user = await requireUser(request);
  await requirePermission(user, 'dashboard.view');
  return apiSuccess({ user }, context);
});
