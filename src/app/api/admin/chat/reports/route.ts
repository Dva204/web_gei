import { apiRoute, apiSuccess } from '@/server/http/response';
import { requireUser } from '@/server/auth/session';
import { listChatReports } from '@/server/chat/repository';
export const runtime = 'nodejs';
export const GET = apiRoute(async (request, context) => apiSuccess(await listChatReports(await requireUser(request), new URL(request.url)), context));
