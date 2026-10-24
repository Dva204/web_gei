import { apiRoute, apiSuccess } from '@/server/http/response';
import { requestToken, sessionUser } from '@/server/auth/session';
export const GET = apiRoute(async (request, context) => apiSuccess({ user: await sessionUser(requestToken(request)) }, context));
