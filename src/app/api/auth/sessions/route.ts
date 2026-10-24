import { apiRoute, apiSuccess } from '@/server/http/response';
import { requestToken, requireUser } from '@/server/auth/session';
import { sessions } from '@/server/auth/account';
export const runtime = 'nodejs';
export const GET = apiRoute(async (request, context) =>
  apiSuccess(
    await sessions(await requireUser(request), requestToken(request)),
    context,
  ),
);
