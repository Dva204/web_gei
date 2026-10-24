import { apiRoute, apiSuccess } from '@/server/http/response';
import { requestToken, sessionUser } from '@/server/auth/session';
import { listRooms } from '@/server/chat/repository';
export const runtime = 'nodejs';
export const GET = apiRoute(async (request, context) => apiSuccess(await listRooms(await sessionUser(requestToken(request))), context));
